import { personaAgent } from './persona-agent';
import { hubspotService } from './hubspot-service';
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
  user_id: number;
  hubspot_token: string;
}

interface JobPayload {
  simulationId: number;
  theme: string;
  industry: string;
  recordType: string;
  recordIndex: number;
  totalRecords: number;
  userId: number;
  hubspotToken: string;
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
      console.log('=== Creating NEW simulation ===');
      console.log('Full config received:', JSON.stringify(config, null, 2));
      
      // Calculate total records and scheduling
      const totalRecords = this.calculateTotalRecords(config.record_distribution);
      const intervalMs = this.calculateInterval(config.duration_days, totalRecords);
      
      // Create scheduled jobs for the simulation
      const jobs = this.createScheduledJobs(config, intervalMs);
      
      // Store jobs in memory (in production, these would go to database)
      this.jobQueue.set(config.simulation_id, jobs);
      
      console.log(`✅ SIMULATION ${config.simulation_id} CONFIGURED:`);
      console.log(`   - Duration: ${config.duration_days} days`);
      console.log(`   - Total records: ${totalRecords}`);
      console.log(`   - Interval: ${Math.floor(intervalMs/1000/60)}m ${Math.floor((intervalMs/1000)%60)}s`);
      console.log(`   - Jobs created: ${jobs.length}`);
      console.log(`=================================`);
      
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
    const intervalMs = Math.floor(totalMs / totalRecords);
    
    console.log(`Timing calculation:`, {
      durationDays,
      totalRecords,
      totalMs: totalMs / 1000 / 60 / 60, // hours
      intervalMs: intervalMs / 1000 / 60, // minutes
      intervalBetweenRecords: `${Math.floor(intervalMs / 1000 / 60)}m ${Math.floor((intervalMs / 1000) % 60)}s`
    });
    
    return intervalMs;
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
            totalRecords: count,
            userId: config.user_id,
            hubspotToken: config.hubspot_token
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
    const shuffledJobs = this.shuffleArray(jobs).map((job, index) => ({
      ...job,
      scheduledFor: new Date(Date.now() + (intervalMs * index))
    }));

    // Schedule association creation after all records are created
    const lastJobTime = shuffledJobs.length > 0 ? shuffledJobs[shuffledJobs.length - 1].scheduledFor.getTime() : Date.now();
    const associationJob: ScheduledJob = {
      id: jobId++,
      simulationId: config.simulation_id,
      jobType: 'create_associations',
      payload: {
        simulationId: config.simulation_id,
        theme: config.theme,
        industry: config.industry,
        recordType: 'association',
        recordIndex: 1,
        totalRecords: 1,
        userId: config.user_id,
        hubspotToken: config.hubspot_token
      } as any,
      status: 'pending',
      scheduledFor: new Date(lastJobTime + intervalMs),
      processedAt: null,
      error: null,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    shuffledJobs.push(associationJob);
    return shuffledJobs;
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

  getSimulationStatus(simulationId: number): any {
    const jobs = this.jobQueue.get(simulationId) || [];
    const now = Date.now();
    
    if (jobs.length === 0) {
      return null;
    }

    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(job => job.status === 'completed');
    const processingJobs = jobs.filter(job => job.status === 'processing');
    const pendingJobs = jobs.filter(job => job.status === 'pending');
    const failedJobs = jobs.filter(job => job.status === 'failed');

    // Count by object type
    const objectCounts = {
      contacts: jobs.filter(job => job.jobType === 'create_contact' && job.status === 'completed').length,
      companies: jobs.filter(job => job.jobType === 'create_company' && job.status === 'completed').length,
      deals: jobs.filter(job => job.jobType === 'create_deal' && job.status === 'completed').length,
      tickets: jobs.filter(job => job.jobType === 'create_ticket' && job.status === 'completed').length,
      notes: jobs.filter(job => job.jobType === 'create_note' && job.status === 'completed').length,
    };

    // Find next job
    const nextPendingJob = pendingJobs
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())[0];

    // Find last completed job
    const lastCompletedJob = completedJobs
      .sort((a, b) => new Date(b.processedAt || 0).getTime() - new Date(a.processedAt || 0).getTime())[0];

    // Calculate timing
    const firstJob = jobs.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())[0];
    const lastJob = jobs.sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime())[0];
    
    const startTime = firstJob ? new Date(firstJob.scheduledFor).getTime() : now;
    const endTime = lastJob ? new Date(lastJob.scheduledFor).getTime() : now;
    const timeElapsed = now - startTime;
    const timeRemaining = Math.max(0, endTime - now);
    const nextJobDelay = nextPendingJob ? Math.max(0, new Date(nextPendingJob.scheduledFor).getTime() - now) : 0;

    const progress = totalJobs > 0 ? (completedJobs.length / totalJobs) * 100 : 0;

    return {
      simulationId,
      totalJobs,
      completedJobs: completedJobs.length,
      processingJobs: processingJobs.length,
      pendingJobs: pendingJobs.length,
      failedJobs: failedJobs.length,
      objectCounts,
      progress: Math.round(progress * 100) / 100,
      timing: {
        startTime,
        endTime,
        timeElapsed,
        timeRemaining,
        nextJobDelay
      },
      lastObject: lastCompletedJob ? {
        type: lastCompletedJob.jobType.replace('create_', ''),
        completedAt: lastCompletedJob.processedAt,
        payload: lastCompletedJob.payload
      } : null,
      nextObject: nextPendingJob ? {
        type: nextPendingJob.jobType.replace('create_', ''),
        scheduledFor: nextPendingJob.scheduledFor,
        payload: nextPendingJob.payload
      } : null,
      status: completedJobs.length === totalJobs ? 'completed' : 
              processingJobs.length > 0 ? 'running' : 
              failedJobs.length > 0 ? 'failed' : 'pending'
    };
  }

  getAllSimulationStatuses(): Record<number, any> {
    const statuses: Record<number, any> = {};
    
    for (const simulationId of Array.from(this.jobQueue.keys())) {
      statuses[simulationId] = this.getSimulationStatus(simulationId);
    }
    
    return statuses;
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

      console.log(`Generated ${payload.recordType} persona:`, persona.data);
      console.log(`Cached: ${persona.cached}`);

      // Push to HubSpot directly using user's token
      let hubspotResult;
      switch (payload.recordType) {
        case 'contact':
          hubspotResult = await hubspotService.createContact(payload.simulationId, persona.data, payload.hubspotToken);
          break;
        case 'company':
          hubspotResult = await hubspotService.createCompany(payload.simulationId, persona.data, payload.hubspotToken);
          break;
        case 'deal':
          hubspotResult = await hubspotService.createDeal(payload.simulationId, persona.data, payload.hubspotToken);
          break;
        case 'ticket':
          hubspotResult = await hubspotService.createTicket(payload.simulationId, persona.data, payload.hubspotToken);
          break;
        case 'note':
          hubspotResult = await hubspotService.createNote(payload.simulationId, persona.data, payload.hubspotToken);
          break;
        case 'association':
          // Create smart associations between all records
          await hubspotService.createSmartAssociations(payload.simulationId, payload.hubspotToken);
          hubspotResult = { success: true, hubspotId: 'associations_created' };
          break;
        default:
          console.log(`Unknown record type: ${payload.recordType}`);
          hubspotResult = { success: false, error: `Unknown record type: ${payload.recordType}` };
      }

      if (!hubspotResult.success) {
        throw new Error(`HubSpot API failed: ${hubspotResult.error}`);
      }

      console.log(`Successfully created HubSpot ${payload.recordType} with ID: ${hubspotResult.hubspotId}`);

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



  stopProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}

export const orchestrator = new SimulationOrchestrator();