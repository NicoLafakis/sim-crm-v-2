import { useQuery, useMutation } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Play, Pause, Square, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Simulation {
  id: number;
  name: string;
  theme: string;
  industry: string;
  frequency: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'cancelled' | 'failed';
  startedAt: string;
  creditsUsed: number;
  config: any;
}

interface SimulationStatus {
  simulationId: number;
  totalJobs: number;
  status: Record<string, number>;
  progress: number;
}

export default function ProgressPage() {
  const { user } = useSession();
  const { toast } = useToast();
  const [expandedRuns, setExpandedRuns] = useState<Set<number>>(new Set());

  const { data: simulations, isLoading } = useQuery<Simulation[]>({
    queryKey: [`/api/user/${user?.id}/simulations`],
    enabled: !!user?.id,
  });

  const { data: simulationStatuses } = useQuery<Record<number, SimulationStatus>>({
    queryKey: [`/api/simulations/status`],
    enabled: !!simulations?.length,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const controlMutation = useMutation({
    mutationFn: async ({ simulationId, action }: { simulationId: number; action: string }) => {
      return apiRequest('POST', `/api/simulation/${simulationId}/${action}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/simulations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/simulations/status`] });
      toast({
        title: "Action completed",
        description: "Simulation status updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update simulation status.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (simulationId: number) => {
      return apiRequest('DELETE', `/api/simulation/${simulationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/simulations`] });
      toast({
        title: "Simulation deleted",
        description: "The simulation record has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete simulation.",
        variant: "destructive",
      });
    },
  });

  const toggleExpanded = (runId: number) => {
    const newExpanded = new Set(expandedRuns);
    if (newExpanded.has(runId)) {
      newExpanded.delete(runId);
    } else {
      newExpanded.add(runId);
    }
    setExpandedRuns(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const activeRuns = simulations?.filter(s => ['running', 'paused', 'pending'].includes(s.status)) || [];
  const canStartNewRun = activeRuns.length < 2;

  if (isLoading) {
    return (
      <div className="min-h-screen font-gameboy flex items-center justify-center" 
           style={{ 
             backgroundColor: 'rgb(34, 78, 34)',
             backgroundImage: 'linear-gradient(rgba(70, 120, 70, 0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(70, 120, 70, 0.45) 1px, transparent 1px)',
             backgroundSize: '20px 20px'
           }}>
        <div className="font-mono text-xl" style={{ color: 'rgb(200, 220, 140)' }}>Loading Runs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-gameboy p-6" 
         style={{ 
           backgroundColor: 'rgb(34, 78, 34)',
           backgroundImage: 'linear-gradient(rgba(70, 120, 70, 0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(70, 120, 70, 0.45) 1px, transparent 1px)',
           backgroundSize: '20px 20px'
         }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-mono font-bold mb-4" style={{ color: 'rgb(200, 220, 140)' }}>
            SIMULATION PROGRESS
          </h1>
          <div className="flex items-center justify-between">
            <div className="font-mono" style={{ color: 'rgb(200, 220, 140)' }}>
              Active Runs: {activeRuns.length}/2
            </div>
            {!canStartNewRun && (
              <Badge variant="secondary" className="text-white" style={{ backgroundColor: 'rgb(50, 100, 50)' }}>
                Maximum runs reached
              </Badge>
            )}
          </div>
        </div>

        {/* Simulations List */}
        <div className="space-y-4">
          {simulations?.length === 0 ? (
            <Card className="border-2 text-white" style={{ backgroundColor: 'rgb(50, 100, 50)', borderColor: 'rgb(70, 140, 70)' }}>
              <CardContent className="p-8 text-center">
                <div className="font-mono text-xl mb-4" style={{ color: 'rgb(200, 220, 140)' }}>NO RUNS FOUND</div>
                <div className="text-sm" style={{ color: 'rgb(180, 200, 120)' }}>Start a new simulation to see it here.</div>
              </CardContent>
            </Card>
          ) : (
            simulations?.map((simulation) => {
              const isExpanded = expandedRuns.has(simulation.id);
              const status = simulationStatuses?.[simulation.id];
              
              return (
                <Card 
                  key={simulation.id}
                  className="border-2 text-white"
                  style={{ backgroundColor: 'rgb(50, 100, 50)', borderColor: 'rgb(70, 140, 70)' }}
                  data-testid={`simulation-card-${simulation.id}`}
                >
                  <Collapsible>
                    <CollapsibleTrigger 
                      className="w-full"
                      onClick={() => toggleExpanded(simulation.id)}
                      data-testid={`expand-simulation-${simulation.id}`}
                    >
                      <CardHeader className="cursor-pointer" style={{ '&:hover': { backgroundColor: 'rgba(70, 140, 70, 0.3)' } }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(simulation.status)}`} />
                            <div>
                              <CardTitle className="text-left font-mono text-xl" style={{ color: 'rgb(200, 220, 140)' }}>
                                {simulation.name}
                              </CardTitle>
                              <CardDescription className="text-left font-mono" style={{ color: 'rgb(180, 200, 120)' }}>
                                {simulation.theme} • {simulation.industry} • {simulation.frequency}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <Badge 
                              variant="secondary" 
                              className={`${getStatusColor(simulation.status)} text-white font-mono`}
                            >
                              {simulation.status.toUpperCase()}
                            </Badge>
                            {isExpanded ? <ChevronUp /> : <ChevronDown />}
                          </div>
                        </div>
                        {status && (
                          <div className="mt-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span>Progress: {status.progress}%</span>
                              <span>{status.status.completed || 0}/{status.totalJobs} jobs</span>
                            </div>
                            <Progress 
                              value={status.progress} 
                              className="h-2" style={{ backgroundColor: 'rgb(70, 140, 70)' }}
                            />
                          </div>
                        )}
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          {/* Detailed Status */}
                          {status && (
                            <div className="grid grid-cols-2 gap-4 p-4 rounded" style={{ backgroundColor: 'rgba(70, 140, 70, 0.3)' }}>
                              <div>
                                <div className="text-sm font-mono mb-2">JOB STATUS</div>
                                <div className="space-y-1 text-xs">
                                  {Object.entries(status.status).map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                      <span>{key}:</span>
                                      <span>{value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm font-mono mb-2">DETAILS</div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span>Started:</span>
                                    <span>{new Date(simulation.startedAt).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Credits:</span>
                                    <span>{simulation.creditsUsed}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Control Buttons */}
                          <div className="flex space-x-2">
                            {simulation.status === 'running' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => controlMutation.mutate({ simulationId: simulation.id, action: 'pause' })}
                                disabled={controlMutation.isPending}
                                className="bg-yellow-600 text-white hover:bg-yellow-700"
                                data-testid={`pause-simulation-${simulation.id}`}
                              >
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                              </Button>
                            )}
                            
                            {simulation.status === 'paused' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => controlMutation.mutate({ simulationId: simulation.id, action: 'resume' })}
                                disabled={controlMutation.isPending}
                                className="bg-green-600 text-white hover:bg-green-700"
                                data-testid={`resume-simulation-${simulation.id}`}
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Resume
                              </Button>
                            )}
                            
                            {['running', 'paused'].includes(simulation.status) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => controlMutation.mutate({ simulationId: simulation.id, action: 'stop' })}
                                disabled={controlMutation.isPending}
                                className="bg-red-600 text-white hover:bg-red-700"
                                data-testid={`stop-simulation-${simulation.id}`}
                              >
                                <Square className="w-4 h-4 mr-2" />
                                Stop
                              </Button>
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteMutation.mutate(simulation.id)}
                              disabled={deleteMutation.isPending}
                              className="bg-red-800 text-white hover:bg-red-900"
                              data-testid={`delete-simulation-${simulation.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}