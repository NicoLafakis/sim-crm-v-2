import { useQuery, useMutation } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Trash2, Info } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Simulation {
  id: number;
  name: string;
  theme: string;
  industry: string;
  frequency: string;
  status: string;
  startedAt: string;
  creditsUsed: number;
  config: any;
}

export default function ProgressPage() {
  const { user } = useSession();
  const { toast } = useToast();
  const [expandedRuns, setExpandedRuns] = useState<Set<number>>(new Set());

  const { data: simulations, isLoading } = useQuery<Simulation[]>({
    queryKey: [`/api/user/${user?.id}/simulations`],
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (simulationId: number) => {
      return apiRequest('DELETE', `/api/simulation/${simulationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/simulations`] });
      toast({
        title: "Configuration deleted",
        description: "The AI strategy has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete AI strategy.",
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
            AI STRATEGY RESULTS
          </h1>
          <div style={{ color: '#000000', fontFamily: 'var(--font-gameboy)' }}>
            Total AI Strategies: {simulations?.length || 0}
          </div>
          <div className="mt-4 p-4 rounded border-2 flex items-center gap-3" style={{ backgroundColor: '#e8e8e8', borderColor: '#6c7b7f', color: '#000000' }}>
            <Info className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold mb-1">AI Strategy Generation Enabled</div>
              <div className="text-sm">Configurations are processed by OpenAI to generate detailed CRM simulation strategies and business scenarios.</div>
            </div>
          </div>
        </div>

        {/* Simulations List */}
        <div className="space-y-4">
          {simulations?.length === 0 ? (
            <Card className="border-2 text-white" style={{ backgroundColor: 'rgb(50, 100, 50)', borderColor: 'rgb(70, 140, 70)' }}>
              <CardContent className="p-8 text-center">
                <div className="text-xl mb-4" style={{ color: 'rgb(200, 220, 140)', fontFamily: 'var(--font-gameboy)' }}>NO AI STRATEGIES FOUND</div>
                <div className="text-sm" style={{ color: 'rgb(180, 200, 120)' }}>Generate an AI strategy to see detailed CRM simulation plans here.</div>
              </CardContent>
            </Card>
          ) : (
            simulations?.map((simulation) => {
              const isExpanded = expandedRuns.has(simulation.id);
              
              return (
                <Card key={simulation.id} className="border-2 text-white" style={{ backgroundColor: 'rgb(50, 100, 50)', borderColor: 'rgb(70, 140, 70)' }}>
                  <Collapsible>
                    <CollapsibleTrigger asChild onClick={() => toggleExpanded(simulation.id)}>
                      <CardHeader className="cursor-pointer hover:bg-opacity-30" style={{ backgroundColor: 'rgba(70, 140, 70, 0.1)' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
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
                            <Badge variant="secondary" className={`text-white font-mono ${
                              simulation.status === 'completed' ? 'bg-green-500' : 
                              simulation.status === 'processing' ? 'bg-yellow-500' :
                              simulation.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                            }`}>
                              {simulation.status === 'completed' ? 'AI COMPLETE' :
                               simulation.status === 'processing' ? 'PROCESSING' :
                               simulation.status === 'failed' ? 'FAILED' : 'CONFIGURED'}
                            </Badge>
                            {isExpanded ? <ChevronUp /> : <ChevronDown />}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          {/* Configuration Details */}
                          <div className="grid grid-cols-2 gap-4 p-4 rounded" style={{ backgroundColor: 'rgba(70, 140, 70, 0.3)' }}>
                            <div>
                              <div className="text-sm mb-2" style={{ fontFamily: 'var(--font-gameboy)', color: 'rgb(200, 220, 140)' }}>
                                CONFIGURATION
                              </div>
                              <div className="space-y-1 text-xs" style={{ color: 'rgb(180, 200, 120)' }}>
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
                                  <span className="font-mono">{new Date(simulation.startedAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-sm mb-2" style={{ fontFamily: 'var(--font-gameboy)', color: 'rgb(200, 220, 140)' }}>
                                PLANNED RECORDS
                              </div>
                              <div className="space-y-1 text-xs" style={{ color: 'rgb(180, 200, 120)' }}>
                                {simulation.config?.record_distribution && Object.entries(simulation.config.record_distribution).map(([type, count]) => (
                                  <div key={type} className="flex justify-between">
                                    <span className="capitalize">{type}:</span>
                                    <span className="font-mono">{count as number}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* AI Strategy Results */}
                          {simulation.config?.aiStrategy && (
                            <div className="p-4 rounded" style={{ backgroundColor: 'rgba(70, 140, 70, 0.2)' }}>
                              <div className="text-sm mb-3" style={{ fontFamily: 'var(--font-gameboy)', color: 'rgb(200, 220, 140)' }}>
                                🤖 AI STRATEGY RESULTS
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
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete Strategy</span>
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