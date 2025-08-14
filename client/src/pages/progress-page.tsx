import { useQuery, useMutation } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Trash2, Info, Clock, Timer, Target } from 'lucide-react';
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
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <div className="text-xs font-mono text-gray-600">{label}</div>
        <div className="text-sm font-mono font-bold text-green-600">{elapsed}</div>
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
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <div className="text-xs font-mono text-gray-600">{label}</div>
        <div className="text-sm font-mono font-bold text-orange-600">{remaining}</div>
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
  const { data: simulationProgress } = useQuery({
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
      <div className="min-h-screen font-gameboy flex items-center justify-center" 
           style={{ 
             backgroundColor: '#e8e8e8',
             backgroundImage: `
               linear-gradient(to right, rgba(176, 176, 176, 0.3) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(176, 176, 176, 0.3) 1px, transparent 1px)
             `,
             backgroundSize: '16px 16px'
           }}>
        <div className="text-xl" style={{ color: '#1e3a5f', fontFamily: 'var(--font-gameboy)' }}>Loading Configurations...</div>
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
          <h1 className="text-4xl font-bold mb-4" style={{ color: '#1e3a5f', fontFamily: 'var(--font-gameboy)' }}>
            SIMULATION RESULTS
          </h1>
          <div style={{ color: '#000000', fontFamily: 'var(--font-gameboy)' }}>
            Total Simulations: {simulations?.length || 0}
          </div>
          <div className="mt-4 p-4 rounded border-2 flex items-center gap-3" style={{ backgroundColor: '#e8e8e8', borderColor: '#6c7b7f', color: '#000000' }}>
            <Info className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold mb-1">Simulation Generation Enabled</div>
              <div className="text-sm">Configurations are processed by OpenAI to generate detailed CRM simulation strategies and business scenarios.</div>
            </div>
          </div>
        </div>

        {/* Simulations List */}
        <div className="space-y-4">
          {simulations?.length === 0 ? (
            <Card className="border-2 rounded-none" style={{ backgroundColor: '#e8e8e8', borderColor: '#6c7b7f', color: '#000000' }}>
              <CardContent className="p-8 text-center">
                <div className="text-xl mb-4" style={{ color: '#1e3a5f', fontFamily: 'var(--font-gameboy)' }}>NO SIMULATIONS FOUND</div>
                <div className="text-sm" style={{ color: '#000000' }}>Generate a simulation to see detailed CRM simulation plans here.</div>
              </CardContent>
            </Card>
          ) : (
            simulations?.map((simulation) => {
              const isExpanded = expandedRuns.has(simulation.id);
              
              return (
                <Card key={simulation.id} className="border-2 rounded-none" style={{ backgroundColor: '#e8e8e8', borderColor: '#6c7b7f', color: '#000000' }}>
                  <Collapsible>
                    <CollapsibleTrigger asChild onClick={() => toggleExpanded(simulation.id)}>
                      <CardHeader className="cursor-pointer" style={{ backgroundColor: '#e8e8e8' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-3 h-3 rounded-full bg-red-800" />
                            <div>
                              <CardTitle className="text-left text-xl" style={{ color: '#1e3a5f', fontFamily: 'var(--font-gameboy)' }}>
                                {simulation.name}
                              </CardTitle>
                              <CardDescription className="text-left" style={{ color: '#000000', fontFamily: 'var(--font-mono)' }}>
                                {simulation.theme} • {simulation.industry} • {simulation.frequency}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <Badge variant="secondary" className={`font-mono ${
                              simulation.status === 'completed' ? 'bg-green-500 text-white' : 
                              simulation.status === 'processing' ? 'bg-yellow-500 text-white' :
                              simulation.status === 'failed' ? 'bg-red-500 text-white' : 'bg-red-800 text-gray-300'
                            }`}>
                              {simulation.status === 'completed' ? 'COMPLETE' :
                               simulation.status === 'processing' ? 'PROCESSING' :
                               simulation.status === 'failed' ? 'FAILED' : 'CONFIGURED'}
                            </Badge>
                            {simulation.status === 'processing' && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent expanding the card
                                  deleteMutation.mutate(simulation.id);
                                }}
                                disabled={deleteMutation.isPending}
                                className="bg-red-600 hover:bg-red-700 text-white font-mono text-xs px-2 py-1 h-6"
                                data-testid={`button-delete-${simulation.id}`}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                DELETE
                              </Button>
                            )}
                            <span style={{ color: '#000000' }}>{isExpanded ? <ChevronUp /> : <ChevronDown />}</span>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          {/* Live Timers - Only show for processing simulations */}
                          {simulation.status === 'processing' && (
                            <div className="grid grid-cols-3 gap-4 p-4 rounded" style={{ backgroundColor: '#2d3748' }}>
                              <LiveTimer 
                                startTime={simulation.startedAt} 
                                label="ELAPSED TIME"
                                icon={<Clock className="w-4 h-4 text-green-400" />}
                              />
                              <CountdownTimer 
                                targetTime={new Date(Date.now() + 30000).toISOString()} 
                                label="NEXT RECORD"
                                icon={<Timer className="w-4 h-4 text-orange-400" />}
                              />
                              <CountdownTimer 
                                targetTime={new Date(new Date(simulation.startedAt).getTime() + (simulation.config?.acceleratorDays * 24 * 60 * 60 * 1000 || 43200000)).toISOString()} 
                                label="COMPLETION"
                                icon={<Target className="w-4 h-4 text-blue-400" />}
                              />
                            </div>
                          )}

                          {/* Configuration Details */}
                          <div className="grid grid-cols-2 gap-4 p-4 rounded" style={{ backgroundColor: '#d4d4d8' }}>
                            <div>
                              <div className="text-sm mb-2" style={{ fontFamily: 'var(--font-gameboy)', color: '#1e3a5f' }}>
                                CONFIGURATION
                              </div>
                              <div className="space-y-1 text-xs" style={{ color: '#000000' }}>
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
                              <div className="text-sm mb-2" style={{ fontFamily: 'var(--font-gameboy)', color: '#1e3a5f' }}>
                                PLANNED RECORDS
                              </div>
                              <div className="space-y-1 text-xs" style={{ color: '#000000' }}>
                                {simulation.config?.record_distribution && Object.entries(simulation.config.record_distribution).map(([type, count]) => (
                                  <div key={type} className="flex justify-between">
                                    <span className="capitalize">{type}:</span>
                                    <span className="font-mono">{count as number}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Live Progress - Only show for processing simulations */}
                          {simulation.status === 'processing' && (
                            <div className="p-4 rounded" style={{ backgroundColor: '#1a202c' }}>
                              <div className="text-sm mb-3" style={{ fontFamily: 'var(--font-gameboy)', color: '#48bb78' }}>
                                🔴 LIVE SIMULATION IN PROGRESS
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-xs" style={{ color: '#e2e8f0' }}>
                                <div>
                                  <div className="mb-2 font-bold">RECORDS CREATED:</div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between">
                                      <span>Contacts:</span>
                                      <span className="font-mono text-green-400">0 / {simulation.config?.record_distribution?.contacts || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Companies:</span>
                                      <span className="font-mono text-green-400">0 / {simulation.config?.record_distribution?.companies || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Deals:</span>
                                      <span className="font-mono text-green-400">0 / {simulation.config?.record_distribution?.deals || 0}</span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <div className="mb-2 font-bold">JOB PROGRESS:</div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between">
                                      <span>Completed:</span>
                                      <span className="font-mono text-green-400">0 steps</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Processing:</span>
                                      <span className="font-mono text-yellow-400">2 steps</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Pending:</span>
                                      <span className="font-mono text-gray-400">37 steps</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* AI Strategy Results - Only show for completed simulations */}
                          {simulation.status === 'completed' && simulation.config?.aiStrategy && (
                            <div className="p-4 rounded" style={{ backgroundColor: '#d4d4d8' }}>
                              <div className="text-sm mb-3" style={{ fontFamily: 'var(--font-gameboy)', color: '#1e3a5f' }}>
                                🤖 SIMULATION RESULTS
                              </div>
                              <div className="bg-gray-900 p-3 rounded text-xs font-mono text-green-400 max-h-64 overflow-y-auto">
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
                              className="flex items-center space-x-1"
                              style={{ backgroundColor: '#8b0000', borderColor: '#8b0000', color: '#9fb89f' }}
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