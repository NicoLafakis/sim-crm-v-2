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
  completedJobs: number;
  processingJobs: number;
  pendingJobs: number;
  failedJobs: number;
  objectCounts: {
    contacts: number;
    companies: number;
    deals: number;
    tickets: number;
    notes: number;
  };
  progress: number;
  timing: {
    startTime: number;
    endTime: number;
    timeElapsed: number;
    timeRemaining: number;
    nextJobDelay: number;
  };
  lastObject: {
    type: string;
    completedAt: string;
    payload: any;
  } | null;
  nextObject: {
    type: string;
    scheduledFor: string;
    payload: any;
  } | null;
  status: string;
}

// Helper function to format duration
const formatDuration = (ms: number): string => {
  if (ms <= 0) return '0s';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

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
        <div className="text-xl" style={{ color: 'rgb(200, 220, 140)', fontFamily: 'var(--font-gameboy)' }}>Loading Runs...</div>
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
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'rgb(200, 220, 140)', fontFamily: 'var(--font-gameboy)' }}>
            SIMULATION PROGRESS
          </h1>
          <div className="flex items-center justify-between">
            <div style={{ color: 'rgb(200, 220, 140)', fontFamily: 'var(--font-gameboy)' }}>
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
                <div className="text-xl mb-4" style={{ color: 'rgb(200, 220, 140)', fontFamily: 'var(--font-gameboy)' }}>NO RUNS FOUND</div>
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
                      <CardHeader className="cursor-pointer hover:bg-opacity-30" style={{ backgroundColor: 'rgba(70, 140, 70, 0.1)' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(simulation.status)}`} />
                            <div>
                              <CardTitle className="text-left text-xl" style={{ color: 'rgb(200, 220, 140)', fontFamily: 'var(--font-gameboy)' }}>
                                {simulation.name}
                              </CardTitle>
                              <CardDescription className="text-left" style={{ color: 'rgb(180, 200, 120)', fontFamily: 'var(--font-mono)' }}>
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
                              <span>{status.completedJobs || 0}/{status.totalJobs} jobs</span>
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
                          {/* Comprehensive Progress Tracking */}
                          {status && (
                            <div className="space-y-4">
                              {/* Main Progress Stats */}
                              <div className="grid grid-cols-3 gap-4 p-4 rounded" style={{ backgroundColor: 'rgba(70, 140, 70, 0.3)' }}>
                                <div>
                                  <div className="text-sm mb-2" style={{ fontFamily: 'var(--font-gameboy)', color: 'rgb(200, 220, 140)' }}>
                                    RUNTIME
                                  </div>
                                  <div className="space-y-1 text-xs" style={{ color: 'rgb(180, 200, 120)' }}>
                                    <div className="flex justify-between">
                                      <span>Running:</span>
                                      <span className="font-mono">
                                        {formatDuration(status.timing.timeElapsed)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Ends in:</span>
                                      <span className="font-mono">
                                        {formatDuration(status.timing.timeRemaining)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>End time:</span>
                                      <span className="font-mono">
                                        {new Date(status.timing.endTime).toLocaleTimeString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="text-sm mb-2" style={{ fontFamily: 'var(--font-gameboy)', color: 'rgb(200, 220, 140)' }}>
                                    OBJECTS CREATED
                                  </div>
                                  <div className="space-y-1 text-xs" style={{ color: 'rgb(180, 200, 120)' }}>
                                    <div className="flex justify-between">
                                      <span>Contacts:</span>
                                      <span className="font-mono">{status.objectCounts.contacts}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Companies:</span>
                                      <span className="font-mono">{status.objectCounts.companies}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Deals:</span>
                                      <span className="font-mono">{status.objectCounts.deals}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Tickets:</span>
                                      <span className="font-mono">{status.objectCounts.tickets}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Notes:</span>
                                      <span className="font-mono">{status.objectCounts.notes}</span>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <div className="text-sm mb-2" style={{ fontFamily: 'var(--font-gameboy)', color: 'rgb(200, 220, 140)' }}>
                                    NEXT ACTION
                                  </div>
                                  <div className="space-y-1 text-xs" style={{ color: 'rgb(180, 200, 120)' }}>
                                    {status.lastObject && (
                                      <div>
                                        <div className="flex justify-between">
                                          <span>Last:</span>
                                          <span className="font-mono capitalize">
                                            {status.lastObject.type}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>at:</span>
                                          <span className="font-mono">
                                            {new Date(status.lastObject.completedAt).toLocaleTimeString()}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    {status.nextObject && (
                                      <div>
                                        <div className="flex justify-between">
                                          <span>Next:</span>
                                          <span className="font-mono capitalize">
                                            {status.nextObject.type}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>in:</span>
                                          <span className="font-mono">
                                            {formatDuration(status.timing.nextJobDelay)}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    {!status.nextObject && status.status === 'completed' && (
                                      <div className="text-center" style={{ color: 'rgb(200, 220, 140)' }}>
                                        ✓ SIMULATION COMPLETE
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Total Progress Bar */}
                              <div className="p-4 rounded" style={{ backgroundColor: 'rgba(70, 140, 70, 0.2)' }}>
                                <div className="flex justify-between text-sm mb-2" style={{ color: 'rgb(200, 220, 140)' }}>
                                  <span style={{ fontFamily: 'var(--font-gameboy)' }}>TOTAL PROGRESS</span>
                                  <span className="font-mono">
                                    {status.completedJobs}/{status.totalJobs} objects ({status.progress}%)
                                  </span>
                                </div>
                                <Progress 
                                  value={status.progress} 
                                  className="h-3" 
                                  style={{ backgroundColor: 'rgb(70, 140, 70)' }}
                                />
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