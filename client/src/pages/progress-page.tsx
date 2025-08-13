import { useQuery, useMutation } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronUp, Trash2, Info, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
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
  creditsUsed: number;
  config: any;
}

interface JobStep {
  stepIndex: number;
  actionType: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'failed_non_retryable';
  error?: string;
  executedAt?: string;
}

interface JobStatus {
  jobId: number;
  simulationId: number;
  status: 'running' | 'completed' | 'failed';
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  queuedSteps: number;
  steps: JobStep[];
  createdAt: string;
  updatedAt: string;
}

export default function ProgressPage() {
  const { user } = useSession();
  const { toast } = useToast();
  const [expandedRuns, setExpandedRuns] = useState<Set<number>>(new Set());
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);

  // Load current job ID from localStorage
  useEffect(() => {
    const storedJobId = localStorage.getItem('currentJobId');
    if (storedJobId) {
      setCurrentJobId(parseInt(storedJobId));
    }
  }, []);

  const { data: simulations, isLoading } = useQuery<Simulation[]>({
    queryKey: [`/api/user/${user?.id}/simulations`],
    enabled: !!user?.id,
  });

  // Poll job status if we have a current job ID
  const { data: jobStatus, isLoading: jobStatusLoading } = useQuery<JobStatus>({
    queryKey: [`/api/job/${currentJobId}/status`],
    enabled: !!currentJobId,
    refetchInterval: (data) => {
      // Stop polling if job is completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds while job is running
    },
    refetchIntervalInBackground: true,
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

  const getStatusIcon = (status: JobStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'failed_non_retryable':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: JobStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
      case 'failed_non_retryable':
        return 'bg-red-500';
      case 'processing':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  const clearCurrentJob = () => {
    setCurrentJobId(null);
    localStorage.removeItem('currentJobId');
    localStorage.removeItem('currentSimulationId');
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

        {/* Current Job Status */}
        {currentJobId && jobStatus && (
          <Card className="mb-6 border-2 border-gray-600 bg-gray-800 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className={`h-5 w-5 ${jobStatus.status === 'running' ? 'animate-spin text-blue-500' : 'text-gray-500'}`} />
                Current Job Progress (ID: {currentJobId})
              </CardTitle>
              <CardDescription className="text-gray-300">
                Status: <Badge variant={jobStatus.status === 'running' ? 'default' : jobStatus.status === 'completed' ? 'secondary' : 'destructive'}>
                  {jobStatus.status.toUpperCase()}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress: {jobStatus.completedSteps}/{jobStatus.totalSteps} steps</span>
                  <span>{Math.round((jobStatus.completedSteps / jobStatus.totalSteps) * 100)}%</span>
                </div>
                <Progress 
                  value={(jobStatus.completedSteps / jobStatus.totalSteps) * 100} 
                  className="h-3"
                  data-testid="progress-bar-job"
                />
              </div>

              {/* Status Summary */}
              <div className="flex gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Completed: {jobStatus.completedSteps}</span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>Failed: {jobStatus.failedSteps}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>Queued: {jobStatus.queuedSteps}</span>
                </div>
              </div>

              {/* Step Details */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    View Step Details
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {jobStatus.steps?.map((step, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 bg-gray-700 rounded">
                        {getStatusIcon(step.status)}
                        <span className="flex-1 text-sm">
                          Step {step.stepIndex + 1}: {step.actionType}
                        </span>
                        <Badge variant="outline" className={`text-xs ${getStatusColor(step.status)} text-white border-none`}>
                          {step.status}
                        </Badge>
                        {step.error && (
                          <div className="text-xs text-red-400 truncate max-w-xs" title={step.error}>
                            Error: {step.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Clear Job Button */}
              {(jobStatus.status === 'completed' || jobStatus.status === 'failed') && (
                <Button 
                  onClick={clearCurrentJob} 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  data-testid="button-clear-job"
                >
                  Clear Job Status
                </Button>
              )}
            </CardContent>
          </Card>
        )}
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
            <Card className="border-2 rounded-none" style={{ backgroundColor: '#e8e8e8', borderColor: '#6c7b7f', color: '#000000' }}>
              <CardContent className="p-8 text-center">
                <div className="text-xl mb-4" style={{ color: '#1e3a5f', fontFamily: 'var(--font-gameboy)' }}>NO AI STRATEGIES FOUND</div>
                <div className="text-sm" style={{ color: '#000000' }}>Generate an AI strategy to see detailed CRM simulation plans here.</div>
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
                              {simulation.status === 'completed' ? 'AI COMPLETE' :
                               simulation.status === 'processing' ? 'PROCESSING' :
                               simulation.status === 'failed' ? 'FAILED' : 'CONFIGURED'}
                            </Badge>
                            <span style={{ color: '#000000' }}>{isExpanded ? <ChevronUp /> : <ChevronDown />}</span>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          {/* Configuration Details */}
                          <div className="grid grid-cols-2 gap-4 p-4 rounded" style={{ 
                            backgroundColor: '#e8e8e8',
                            backgroundImage: `
                              linear-gradient(to right, rgba(176, 176, 176, 0.3) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(176, 176, 176, 0.3) 1px, transparent 1px)
                            `,
                            backgroundSize: '16px 16px'
                          }}>
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
                                  <span className="font-mono">{new Date(simulation.startedAt).toLocaleDateString()}</span>
                                </div>
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

                          {/* AI Strategy Results */}
                          {simulation.config?.aiStrategy && (
                            <div className="p-4 rounded" style={{ 
                              backgroundColor: '#e8e8e8',
                              backgroundImage: `
                                linear-gradient(to right, rgba(176, 176, 176, 0.3) 1px, transparent 1px),
                                linear-gradient(to bottom, rgba(176, 176, 176, 0.3) 1px, transparent 1px)
                              `,
                              backgroundSize: '16px 16px'
                            }}>
                              <div className="text-sm mb-3" style={{ fontFamily: 'var(--font-gameboy)', color: '#1e3a5f' }}>
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
                              style={{ backgroundColor: '#8b0000', borderColor: '#8b0000', color: '#9fb89f' }}
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