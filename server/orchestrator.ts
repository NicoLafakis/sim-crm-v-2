import { personaAgent } from './persona-agent';
import type { 
  Simulation, 
  ScheduledJob, 
  InsertScheduledJob 
} from '@shared/schema';

interface SimulationConfig {
  simulation_id: number;
  theme: string;
  industry: string;
  duration_days: number;
  record_distribution: {
    contacts: number;
    companies: number;
    deals: number;
    tickets: number;
    notes: number;
  };
  user_tier: string;
  credit_limit: number;
}

interface JobPayload {
  simulationId: number;
  theme: string;
  industry: string;
  recordType: string;
  recordIndex: number;
  totalRecords: number;
}

export class SimulationOrchestrator {
  private jobQueue: Map<number, ScheduledJob[]> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor() {
    // Start the job processor
    this.startJobProcessor();
  }

  async createSimulation(config: SimulationConfig): Promise<{ success: boolean; simulationId: number }> {
    try {
      console.log('Creating simulation with config:', config);
      
      // Calculate total records and scheduling
      const totalRecords = this.calculateTotalRecords(config.record_distribution);
      const intervalMs = this.calculateInterval(config.duration_days, totalRecords);
      
      // Create scheduled jobs for the simulation
      const jobs = this.createScheduledJobs(config, intervalMs);
      
      // Store jobs in memory (in production, these would go to database)
      this.jobQueue.set(config.simulation_id, jobs);
      
      console.log(`Created ${jobs.length} jobs for simulation ${config.simulation_id}`);
      console.log(`Jobs will be processed every ${intervalMs}ms over ${config.duration_days} days`);
      
      return { 
        success: true, 
        simulationId: config.simulation_id 
      };
    } catch (error) {
      console.error('Failed to create simulation:', error);
      return { 
        success: false, 
        simulationId: config.simulation_id 
      };
    }
  }

  private calculateTotalRecords(distribution: SimulationConfig['record_distribution']): number {
    return Object.values(distribution).reduce((sum, val) => sum + val, 0);
  }

  private calculateInterval(durationDays: number, totalRecords: number): number {
    const totalMs = durationDays * 24 * 60 * 60 * 1000;
    return Math.floor(totalMs / totalRecords);
  }

  private createScheduledJobs(config: SimulationConfig, intervalMs: number): ScheduledJob[] {
    const jobs: ScheduledJob[] = [];
    let currentTime = Date.now();
    let jobId = 1;

    // Create jobs for each record type based on distribution
    const recordTypes = [
      { type: 'contact', count: config.record_distribution.contacts },
      { type: 'company', count: config.record_distribution.companies },
      { type: 'deal', count: config.record_distribution.deals },
      { type: 'ticket', count: config.record_distribution.tickets },
      { type: 'note', count: config.record_distribution.notes }
    ];

    for (const { type, count } of recordTypes) {
      for (let i = 0; i < count; i++) {
        const job: ScheduledJob = {
          id: jobId++,
          simulationId: config.simulation_id,
          jobType: `create_${type}`,
          payload: {
            simulationId: config.simulation_id,
            theme: config.theme,
            industry: config.industry,
            recordType: type,
            recordIndex: i + 1,
            totalRecords: count
          } as any,
          status: 'pending',
          scheduledFor: new Date(currentTime),
          processedAt: null,
          error: null,
          retryCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        jobs.push(job);
        currentTime += intervalMs;
      }
    }

    // Shuffle jobs to create a more realistic distribution
    return this.shuffleArray(jobs).map((job, index) => ({
      ...job,
      scheduledFor: new Date(Date.now() + (intervalMs * index))
    }));
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private startJobProcessor(): void {
    // Process jobs every 5 seconds
    this.processingInterval = setInterval(() => {
      if (!this.isProcessing) {
        this.processJobs();
      }
    }, 5000);
  }

  private async processJobs(): Promise<void> {
    this.isProcessing = true;
    
    try {
      const now = Date.now();
      
      // Process jobs for each simulation
      for (const [simulationId, jobs] of Array.from(this.jobQueue.entries())) {
        const pendingJobs = jobs.filter(
          (job: ScheduledJob) => job.status === 'pending' && 
          new Date(job.scheduledFor).getTime() <= now
        );

        for (const job of pendingJobs) {
          await this.processJob(job);
        }

        // Remove completed simulations
        const remainingJobs = jobs.filter((job: ScheduledJob) => job.status !== 'completed');
        if (remainingJobs.length === 0) {
          this.jobQueue.delete(simulationId);
          console.log(`Simulation ${simulationId} completed`);
        }
      }
    } catch (error) {
      console.error('Error processing jobs:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processJob(job: ScheduledJob): Promise<void> {
    try {
      console.log(`Processing job ${job.id} for simulation ${job.simulationId}`);
      job.status = 'processing';
      job.updatedAt = new Date();

      const payload = job.payload as JobPayload;
      
      // Generate persona using OpenAI
      const personaType = payload.recordType as any;
      const persona = await personaAgent.generatePersona({
        theme: payload.theme,
        industry: payload.industry,
        personaType,
        simulationId: payload.simulationId
      });

      // Here you would normally push to HubSpot
      // For now, just log the result
      console.log(`Generated ${payload.recordType} persona:`, persona.data);
      console.log(`Cached: ${persona.cached}`);

      // Mark job as completed
      job.status = 'completed';
      job.processedAt = new Date();
      job.updatedAt = new Date();
      
    } catch (error) {
      console.error(`Failed to process job ${job.id}:`, error);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.retryCount = (job.retryCount || 0) + 1;
      job.updatedAt = new Date();
      
      // Retry logic
      if ((job.retryCount || 0) < 3) {
        // Reschedule for retry in 1 minute
        job.scheduledFor = new Date(Date.now() + 60000);
        job.status = 'pending';
        console.log(`Rescheduling job ${job.id} for retry`);
      }
    }
  }

  async getSimulationStatus(simulationId: number): Promise<any> {
    const jobs = this.jobQueue.get(simulationId);
    if (!jobs) {
      return { status: 'not_found' };
    }

    const statusCounts = jobs.reduce((acc, job) => {
      const status = job.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      simulationId,
      totalJobs: jobs.length,
      status: statusCounts,
      progress: Math.round((statusCounts.completed || 0) / jobs.length * 100)
    };
  }

  stopProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}

export const orchestrator = new SimulationOrchestrator();