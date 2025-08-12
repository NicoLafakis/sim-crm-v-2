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
      
      this.logSimulationPlan(jobs);
      
      console.log(`✅ SIMULATION ${config.simulation_id} CONFIGURED:`);
      console.log(`   - Duration: ${config.duration_days} days`);
      console.log(`   - Deal cycles: ${config.record_distribution.deals}`);
      console.log(`   - Jobs per cycle: ${jobs.length / config.record_distribution.deals}`);
      console.log(`   - Total jobs: ${jobs.length}`);
      console.log(`   - Following CSV timing specification`);
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
    // Universal 30-day timing sequence based on CSV specification
    const salesCycleSteps = [
      // Day 0 - Initial creation triad
      { day: 0, type: 'contact', action: 'create', stage: 'Appointment Scheduled', description: 'Create Contact and set source fields', associations: ['Company', 'Deal'] },
      { day: 0, type: 'company', action: 'create', stage: 'Appointment Scheduled', description: 'Create Company (domain if available)', associations: ['Contact', 'Deal'] },
      { day: 0, type: 'deal', action: 'create', stage: 'Appointment Scheduled', description: 'Create Deal in default pipeline; stage=Appointment Scheduled', associations: ['Contact', 'Company'] },
      
      // Day 1 - Deal enrichment
      { day: 1, type: 'deal', action: 'update', stage: 'Appointment Scheduled', description: 'Enrich fields (ICP fit, ARR band, timeline)' },
      
      // Day 3 - Qualification stage
      { day: 3, type: 'deal', action: 'advance_stage', stage: 'Qualified to Buy', description: 'Promote to Qualified to Buy' },
      { day: 3, type: 'note', action: 'create', stage: 'Qualified to Buy', description: 'Create single Note with discovery summary fields', associations: ['Contact', 'Deal'] },
      
      // Day 5 - Presentation stage
      { day: 5, type: 'deal', action: 'advance_stage', stage: 'Presentation Scheduled', description: 'Move to Presentation Scheduled' },
      
      // Day 7-8 - Ticket creation and update
      { day: 7, type: 'ticket', action: 'create', stage: 'Presentation Scheduled', description: 'Create single Ticket to track pilot/setup tasks', associations: ['Contact', 'Deal', 'Company'] },
      { day: 8, type: 'ticket', action: 'update', stage: 'Presentation Scheduled', description: 'Update Ticket with pilot kickoff checklist values' },
      
      // Day 10 - Decision maker stage
      { day: 10, type: 'deal', action: 'advance_stage', stage: 'Decision Maker Bought-In', description: 'Stage advance after stakeholder alignment' },
      
      // Day 12 - Security review
      { day: 12, type: 'ticket', action: 'update', stage: 'Decision Maker Bought-In', description: 'Attach security/legal checklist status to Ticket' },
      
      // Day 14-15 - Contract stage
      { day: 14, type: 'deal', action: 'advance_stage', stage: 'Contract Sent', description: 'Move to Contract Sent with amount/close date' },
      { day: 15, type: 'ticket', action: 'update', stage: 'Contract Sent', description: 'Record commercial terms review progress' },
      
      // Day 18 - Redlines resolved
      { day: 18, type: 'ticket', action: 'update', stage: 'Contract Sent', description: 'Record redlines resolved flag' },
      
      // Day 20 - Verbal commitment
      { day: 20, type: 'deal', action: 'update', stage: 'Contract Sent', description: 'Set verbal commit=Yes and implementation target date' },
      
      // Day 22 - Win/Close ticket
      { day: 22, type: 'deal', action: 'advance_stage', stage: 'Closed Won', description: 'If signed, set stage=Closed Won; close Ticket', ticketAction: 'close' },
      
      // Day 24 - Refresh close date if not won
      { day: 24, type: 'deal', action: 'update', stage: 'Contract Sent', description: 'If not won yet, refresh close date' },
      
      // Day 26 - Escalate ticket
      { day: 26, type: 'ticket', action: 'update', stage: 'Contract Sent', description: 'Escalate Ticket priority to High' },
      
      // Day 28 - Risk assessment
      { day: 28, type: 'deal', action: 'update', stage: 'Contract Sent', description: 'Set risk reason=\'silence\'; next step entered' },
      
      // Day 30 - Close lost if still open
      { day: 30, type: 'deal', action: 'advance_stage', stage: 'Closed Lost', description: 'If still open, set Closed Lost and close Ticket', ticketAction: 'close' }
    ];

    const jobs: ScheduledJob[] = [];
    const baseTime = Date.now();
    let jobId = 1;

    // Calculate how many complete cycles we can create based on record distribution
    const totalDeals = config.record_distribution.deals;
    const msPerDay = intervalMs * (config.duration_days / 30); // Adjust interval based on duration

    // Create jobs for each deal cycle
    for (let cycleIndex = 0; cycleIndex < totalDeals; cycleIndex++) {
      const cycleStartTime = baseTime + (cycleIndex * msPerDay * 30); // Each cycle takes 30 days

      for (const step of salesCycleSteps) {
        const job: ScheduledJob = {
          id: jobId++,
          simulationId: config.simulation_id,
          jobType: `${step.action}_${step.type}`,
          payload: {
            simulationId: config.simulation_id,
            theme: config.theme,
            industry: config.industry,
            recordType: step.type,
            action: step.action,
            stage: step.stage,
            description: step.description,
            associations: step.associations || [],
            ticketAction: (step as any).ticketAction,
            cycleIndex: cycleIndex + 1,
            totalCycles: totalDeals,
            userId: config.user_id,
            hubspotToken: config.hubspot_token
          } as any,
          status: 'pending',
          scheduledFor: new Date(cycleStartTime + (step.day * msPerDay)),
          processedAt: null,
          error: null,
          retryCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        jobs.push(job);
      }
    }

    return jobs.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  }

  private logSimulationPlan(jobs: ScheduledJob[]): void {
    console.log(`\n=== SIMULATION PLAN (${jobs.length} jobs) ===`);
    console.log('Following universal 30-day sales cycle timing:');
    
    const groupedJobs = jobs.reduce((acc, job) => {
      const day = Math.floor((job.scheduledFor.getTime() - jobs[0].scheduledFor.getTime()) / (24 * 60 * 60 * 1000));
      const key = `Day ${day}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(job);
      return acc;
    }, {} as Record<string, ScheduledJob[]>);

    Object.entries(groupedJobs).slice(0, 10).forEach(([day, dayJobs]) => {
      console.log(`${day}: ${dayJobs.map(j => `${j.jobType}`).join(', ')}`);
    });
    console.log('=======================================\n');
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