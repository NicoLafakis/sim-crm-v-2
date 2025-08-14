import { useQuery, useMutation } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Trash2, Info, Clock, Timer, Target, Pause, Play, Square } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Simulation {
  id: number;
  name: string;
  theme: string;
  industry: string;
  frequency: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  creditsUsed: number;
  config: any;
}

// Live Timer Component
function LiveTimer({ startTime, label, icon }: { startTime: string; label: string; icon: React.ReactNode }) {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    const updateTimer = () => {
      const start = new Date(startTime);
      const now = new Date();
      const diff = Math.max(0, now.getTime() - start.getTime());
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded border">
      {icon}
      <div>
        <div className="text-xs font-mono text-gray-800 font-semibold">{label}</div>
        <div className="text-lg font-mono font-bold text-green-700">{elapsed}</div>
      </div>
    </div>
  );
}

// Countdown Timer Component
function CountdownTimer({ targetTime, label, icon }: { targetTime: string; label: string; icon: React.ReactNode }) {
  const [remaining, setRemaining] = useState('00:00:00');

  useEffect(() => {
    const updateCountdown = () => {
      const target = new Date(targetTime);
      const now = new Date();
      const diff = Math.max(0, target.getTime() - now.getTime());
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded border">
      {icon}
      <div>
        <div className="text-xs font-mono text-gray-800 font-semibold">{label}</div>
        <div className="text-lg font-mono font-bold text-orange-700">{remaining}</div>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const { user } = useSession();
  const { toast } = useToast();
  const [expandedRuns, setExpandedRuns] = useState<Set<number>>(new Set());

  const { data: simulations, isLoading } = useQuery<Simulation[]>({
    queryKey: [`/api/user/${user?.id}/simulations`],
    enabled: !!user?.id,
    refetchInterval: 5000, // Refetch every 5 seconds for live updates
  });

  // Get live progress data for processing simulations
  const { data: simulationProgress } = useQuery<any[]>({
    queryKey: [`/api/simulation/progress`],
    enabled: simulations?.some(s => s.status === 'processing'),
    refetchInterval: 2000, // Update progress every 2 seconds
  });

  const deleteMutation = useMutation({
    mutationFn: async (simulationId: number) => {
      return apiRequest('DELETE', `/api/simulation/${simulationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/simulations`] });
      toast({
        title: "Configuration deleted",
        description: "The simulation has been removed.",
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

  const pauseMutation = useMutation({
    mutationFn: async (simulationId: number) => {
      return apiRequest('POST', `/api/simulation/${simulationId}/pause`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/simulations`] });
      toast({
        title: "Simulation paused",
        description: "The simulation has been paused.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to pause simulation.",
        variant: "destructive",
      });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async (simulationId: number) => {
      return apiRequest('POST', `/api/simulation/${simulationId}/resume`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/simulations`] });
      toast({
        title: "Simulation resumed",
        description: "The simulation has been resumed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resume simulation.",
        variant: "destructive",
      });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async (simulationId: number) => {
      return apiRequest('POST', `/api/simulation/${simulationId}/stop`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/simulations`] });
      toast({
        title: "Simulation stopped",
        description: "The simulation has been stopped.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to stop simulation.",
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

  if (isLoading) {
    return (
      <div className="min-h-screen font-gameboy flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-800 font-gameboy">Loading Configurations...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-gameboy p-6" 
         style={{ 
           backgroundColor: '#e8e8e8',
           backgroundImage: `
             linear-gradient(to right, rgba(176, 176, 176, 0.3) 1px, transparent 1px),
             linear-gradient(to bottom, rgba(176, 176, 176, 0.3) 1px, transparent 1px)
           `,
           backgroundSize: '16px 16px'
         }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 text-gameboy-dark font-gameboy">
            SIMULATION RESULTS
          </h1>
          <div className="text-gameboy-text font-gameboy mb-4">
            Total Simulations: {simulations?.length || 0}
          </div>
          <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded flex items-center gap-3">
            <Info className="w-5 h-5 flex-shrink-0 text-blue-600" />
            <div className="text-gray-800">
              <div className="font-bold mb-1 text-blue-900">Simulation Generation Enabled</div>
              <div className="text-sm">Configurations are processed by OpenAI to generate detailed CRM simulation strategies and business scenarios.</div>
            </div>
          </div>
        </div>

        {/* Simulations List */}
        <div className="space-y-4">
          {simulations?.length === 0 ? (
            <Card className="bg-white border-2 border-gray-300 shadow-md">
              <CardContent className="p-8 text-center">
                <div className="text-xl mb-4 text-blue-900 font-gameboy">NO SIMULATIONS FOUND</div>
                <div className="text-sm text-gray-700">Generate a simulation to see detailed CRM simulation plans here.</div>
              </CardContent>
            </Card>
          ) : (
            simulations?.map((simulation) => {
              const isExpanded = expandedRuns.has(simulation.id);
              const progressData = simulationProgress?.find((p: any) => p.simulationId === simulation.id);
              
              return (
                <Card key={simulation.id} className="bg-white border-2 border-gray-300 shadow-md">
                  <Collapsible>
                    <CollapsibleTrigger asChild onClick={() => toggleExpanded(simulation.id)}>
                      <CardHeader className="cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-3 h-3 rounded-full ${
                              simulation.status === 'completed' ? 'bg-green-500' : 
                              simulation.status === 'processing' ? 'bg-yellow-500' :
                              simulation.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                            }`} />
                            <div>
                              <CardTitle className="text-left text-xl text-blue-900 font-gameboy">
                                {simulation.name}
                              </CardTitle>
                              <CardDescription className="text-left text-gray-700 font-mono">
                                {simulation.theme} • {simulation.industry} • {simulation.frequency}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <Badge variant="secondary" className={`font-mono border-2 ${
                              simulation.status === 'completed' ? 'bg-green-100 text-green-800 border-green-300' : 
                              simulation.status === 'processing' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                              simulation.status === 'paused' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                              simulation.status === 'stopped' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                              simulation.status === 'failed' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-gray-100 text-gray-800 border-gray-300'
                            }`}>
                              {simulation.status === 'completed' ? 'COMPLETE' :
                               simulation.status === 'processing' ? 'PROCESSING' :
                               simulation.status === 'paused' ? 'PAUSED' :
                               simulation.status === 'stopped' ? 'STOPPED' :
                               simulation.status === 'failed' ? 'FAILED' : 'CONFIGURED'}
                            </Badge>
                            {progressData && (
                              <div className="text-sm font-mono text-gray-700">
                                {Math.round((progressData.completedSteps / progressData.totalSteps) * 100)}% Complete
                              </div>
                            )}
                            {(simulation.status === 'processing' || simulation.status === 'paused') && (
                              <div className="flex gap-1">
                                {simulation.status === 'processing' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      pauseMutation.mutate(simulation.id);
                                    }}
                                    disabled={pauseMutation.isPending}
                                    className="bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-300 font-mono text-xs px-2 py-1 h-6"
                                    data-testid={`button-pause-${simulation.id}`}
                                  >
                                    <Pause className="w-3 h-3 mr-1" />
                                    PAUSE
                                  </Button>
                                )}
                                {simulation.status === 'paused' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      resumeMutation.mutate(simulation.id);
                                    }}
                                    disabled={resumeMutation.isPending}
                                    className="bg-green-100 hover:bg-green-200 text-green-700 border-green-300 font-mono text-xs px-2 py-1 h-6"
                                    data-testid={`button-resume-${simulation.id}`}
                                  >
                                    <Play className="w-3 h-3 mr-1" />
                                    RESUME
                                  </Button>
                                )}
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    stopMutation.mutate(simulation.id);
                                  }}
                                  disabled={stopMutation.isPending}
                                  className="bg-red-600 hover:bg-red-700 text-white font-mono text-xs px-2 py-1 h-6"
                                  data-testid={`button-stop-${simulation.id}`}
                                >
                                  <Square className="w-3 h-3 mr-1" />
                                  STOP
                                </Button>
                              </div>
                            )}
                            <span className="text-gray-600">{isExpanded ? <ChevronUp /> : <ChevronDown />}</span>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          {/* Live Timers - Only show for active simulations */}
                          {(simulation.status === 'processing' || simulation.status === 'paused') && (
                            <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 border-2 border-blue-200 rounded">
                              <LiveTimer 
                                startTime={simulation.startedAt} 
                                label="ELAPSED TIME"
                                icon={<Clock className="w-4 h-4 text-green-600" />}
                              />
                              <CountdownTimer 
                                targetTime={new Date(Date.now() + 30000).toISOString()} 
                                label="NEXT RECORD"
                                icon={<Timer className="w-4 h-4 text-orange-600" />}
                              />
                              <CountdownTimer 
                                targetTime={new Date(new Date(simulation.startedAt).getTime() + (simulation.config?.acceleratorDays * 24 * 60 * 60 * 1000 || 43200000)).toISOString()} 
                                label="COMPLETION"
                                icon={<Target className="w-4 h-4 text-blue-600" />}
                              />
                            </div>
                          )}

                          {/* Configuration Details */}
                          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-200 rounded">
                            <div>
                              <div className="text-sm mb-2 font-gameboy text-blue-900 font-bold">
                                CONFIGURATION
                              </div>
                              <div className="space-y-1 text-xs text-gray-800">
                                <div className="flex justify-between">
                                  <span>Theme:</span>
                                  <span className="font-mono">{simulation.theme}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Industry:</span>
                                  <span className="font-mono">{simulation.industry}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Frequency:</span>
                                  <span className="font-mono">{simulation.frequency}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Created:</span>
                                  <span className="font-mono">{simulation.startedAt ? new Date(simulation.startedAt).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Status:</span>
                                  <span className="font-mono">{simulation.status.toUpperCase()}</span>
                                </div>
                                {simulation.status === 'processing' && (
                                  <div className="flex justify-between">
                                    <span>Running:</span>
                                    <span className="font-mono text-green-600">IN PROGRESS</span>
                                  </div>
                                )}
                                {simulation.status === 'completed' && (
                                  <div className="flex justify-between">
                                    <span>Completed:</span>
                                    <span className="font-mono">{simulation.completedAt ? new Date(simulation.completedAt).toLocaleDateString() : 'Unknown'}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-sm mb-2 font-gameboy text-blue-900 font-bold">
                                PLANNED RECORDS
                              </div>
                              <div className="space-y-1 text-xs text-gray-800">
                                {simulation.config?.record_distribution && Object.entries(simulation.config.record_distribution).map(([type, count]) => (
                                  <div key={type} className="flex justify-between">
                                    <span className="capitalize">{type}:</span>
                                    <span className="font-mono">{count as number}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Live Progress - Show for active simulations */}
                          {(simulation.status === 'processing' || simulation.status === 'paused') && progressData && (
                            <div className="p-4 bg-green-50 border-2 border-green-200 rounded">
                              <div className="text-sm mb-3 font-gameboy text-green-800 font-bold">
                                {simulation.status === 'processing' ? '🟢 LIVE SIMULATION IN PROGRESS' : '⏸️ SIMULATION PAUSED'}
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-xs text-gray-800">
                                <div>
                                  <div className="mb-2 font-bold text-green-800">CRM OPERATIONS:</div>
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span>Completed:</span>
                                      <span className="font-mono text-green-700 font-bold">{progressData?.completedSteps || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span>In Progress:</span>
                                      <span className="font-mono text-yellow-700 font-bold">{progressData?.processingSteps || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span>Failed:</span>
                                      <span className="font-mono text-red-700 font-bold">{progressData?.failedSteps || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span>Remaining:</span>
                                      <span className="font-mono text-gray-700 font-bold">{(progressData?.totalSteps || 0) - (progressData?.completedSteps || 0) - (progressData?.processingSteps || 0) - (progressData?.failedSteps || 0)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <div className="mb-2 font-bold text-green-800">SIMULATION STATUS:</div>
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span>Progress:</span>
                                      <span className="font-mono text-blue-700 font-bold">
                                        {progressData ? Math.round((progressData.completedSteps / progressData.totalSteps) * 100) : 0}%
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span>Total Actions:</span>
                                      <span className="font-mono text-blue-700 font-bold">{progressData?.totalSteps || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span>Next Action:</span>
                                      <span className="font-mono text-orange-700 font-bold">
                                        {progressData?.nextStepTime ? 
                                          new Date(progressData.nextStepTime).toLocaleTimeString() : 
                                          simulation.status === 'paused' ? 'Paused' : 'Soon'
                                        }
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 text-xs text-gray-600 bg-blue-50 p-2 rounded">
                                <strong>What are "Operations"?</strong> These are actual CRM actions (create contacts, companies, deals, tickets, updates, notes) being executed in your HubSpot account.
                              </div>
                            </div>
                          )}

                          {/* AI Strategy Results - Only show for completed simulations */}
                          {simulation.status === 'completed' && simulation.config?.aiStrategy && (
                            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded">
                              <div className="text-sm mb-3 font-gameboy text-blue-900 font-bold">
                                🤖 SIMULATION RESULTS
                              </div>
                              <div className="bg-white border border-gray-300 p-3 rounded text-xs font-mono text-gray-800">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(simulation.config.aiStrategy, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteMutation.mutate(simulation.id)}
                              disabled={deleteMutation.isPending}
                              className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 text-white font-mono"
                              data-testid={`button-delete-simulation-${simulation.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete Simulation</span>
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