import { storage } from './storage';
import { Simulation, InsertJob, InsertJobStep } from '../shared/schema';
import { readFileSync } from 'fs';
import { join } from 'path';

// CSV template structure
interface CsvRow {
  templateDay: number;
  typeOfAction: string;
  recordType: string;
  recordIdTpl: string;
  associationsTpl: string;
  originalSource: string;
  actionTpl: string;
  reasonTpl: string;
}

// Job runner state
let jobRunnerInterval: NodeJS.Timeout | null = null;

/**
 * Schedule a simulation job by reading CSV template, computing scaling, and inserting job/steps
 */
export async function scheduleSimulationJob(
  simulation: Simulation, 
  outcome: 'won' | 'lost', 
  acceleratorDays: number
): Promise<{ jobId: number; stepsCount: number }> {
  try {
    // Read the appropriate CSV template based on outcome
    const csvPath = join(process.cwd(), 'attached_assets', `universal_30day_timing_key.csv`);
    let csvContent: string;
    
    try {
      csvContent = readFileSync(csvPath, 'utf-8');
    } catch (fileError) {
      throw new Error(`CSV template file not found at ${csvPath}. Please ensure the template file exists.`);
    }
    
    // Parse CSV content (skip header row)
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    const rows: CsvRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= headers.length) {
        rows.push({
          templateDay: parseInt(values[0]) || 0,
          typeOfAction: values[1] || '',
          recordType: values[2] || '',
          recordIdTpl: values[3] || '',
          associationsTpl: values[4] || '',
          originalSource: values[5] || '',
          actionTpl: values[6] || '',
          reasonTpl: values[7] || ''
        });
      }
    }

    // Filter rows based on outcome - include universal rows and outcome-specific rows
    const filteredRows = rows.filter(row => 
      row.originalSource === 'universal' || 
      row.originalSource === outcome ||
      row.originalSource.toLowerCase().includes(outcome)
    );
    
    // Compute scaling factor
    const baseCycleDays = 30; // Default 30-day cycle
    const scalingFactor = acceleratorDays / baseCycleDays;
    
    // Create the job
    const jobData: InsertJob = {
      simulationId: simulation.id,
      outcome,
      theme: simulation.theme,
      industry: simulation.industry,
      contactSeq: 1, // Could be derived from simulation config
      originalSource: `orchestrator_${outcome}`,
      acceleratorDays,
      baseCycleDays,
      jobStartAt: new Date(),
      status: 'pending',
      metadata: {
        scalingFactor,
        originalRowCount: filteredRows.length,
        csvSource: 'universal_30day_timing_key.csv'
      }
    };

    const createdJob = await storage.createJob(jobData);
    
    // Generate job steps with monotonic scaledDay values
    const jobStartTime = new Date();
    const jobStepsData: InsertJobStep[] = [];
    
    filteredRows.forEach((row, index) => {
      const scaledDay = Math.floor(row.templateDay * scalingFactor);
      const scheduledAt = new Date(jobStartTime.getTime() + scaledDay * 24 * 60 * 60 * 1000);
      
      // Substitute template placeholders
      const substitutedActionTpl = substituteTemplatePlaceholders(row.actionTpl, simulation);
      const substitutedReasonTpl = substituteTemplatePlaceholders(row.reasonTpl, simulation);
      const substitutedRecordIdTpl = substituteTemplatePlaceholders(row.recordIdTpl, simulation);
      
      jobStepsData.push({
        jobId: createdJob.id,
        stepIndex: index + 1,
        templateDay: row.templateDay,
        scaledDay,
        scheduledAt,
        typeOfAction: row.typeOfAction,
        recordType: row.recordType,
        recordIdTpl: substitutedRecordIdTpl,
        associationsTpl: parseJsonSafely(row.associationsTpl),
        originalSource: row.originalSource,
        actionTpl: parseJsonSafely(substitutedActionTpl),
        reasonTpl: substitutedReasonTpl,
        status: 'pending',
        result: null
      });
    });

    // Sort by scaledDay to ensure monotonic scheduling
    jobStepsData.sort((a, b) => (a.scaledDay || 0) - (b.scaledDay || 0));

    // Insert all job steps
    const createdSteps = await storage.createJobSteps(jobStepsData);

    return {
      jobId: createdJob.id,
      stepsCount: createdSteps.length
    };

  } catch (error: any) {
    console.error('Error scheduling simulation job:', error);
    throw new Error(`Failed to schedule simulation job: ${error.message}`);
  }
}

/**
 * Run due job steps by querying pending steps and executing their actions
 */
export async function runDueJobSteps(): Promise<{ processed: number; successful: number; failed: number }> {
  try {
    const now = new Date();
    const dueSteps = await storage.getDueJobSteps(now);
    
    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (const step of dueSteps) {
      try {
        processed++;
        
        // Mark step as processing
        await storage.updateJobStepStatus(step.id, 'processing');

        // Execute the action based on step type
        const result = await executeJobStepAction(step);
        
        // Mark as completed with result
        await storage.updateJobStepStatus(step.id, 'completed', result);
        successful++;
        
      } catch (error: any) {
        // Mark as failed with error details
        await storage.updateJobStepStatus(step.id, 'failed', {
          error: error.message,
          timestamp: new Date().toISOString(),
          retryCount: 0
        });
        failed++;
        
        console.error(`Job step ${step.id} failed:`, error.message);
      }
    }

    if (processed > 0) {
      console.log(`Job runner processed ${processed} steps: ${successful} successful, ${failed} failed`);
    }

    return { processed, successful, failed };

  } catch (error: any) {
    console.error('Error running due job steps:', error);
    throw new Error(`Failed to run due job steps: ${error.message}`);
  }
}

/**
 * Start the job runner with a configurable interval
 */
export function startJobRunner(intervalMs: number = 30000): void {
  if (jobRunnerInterval) {
    console.log('Job runner is already running');
    return;
  }

  console.log(`Starting job runner with ${intervalMs}ms interval`);
  
  jobRunnerInterval = setInterval(async () => {
    try {
      await runDueJobSteps();
    } catch (error: any) {
      console.error('Job runner interval error:', error);
    }
  }, intervalMs);

  // Run immediately on start
  runDueJobSteps().catch((error: any) => {
    console.error('Initial job runner execution error:', error);
  });
}

/**
 * Stop the job runner
 */
export function stopJobRunner(): void {
  if (jobRunnerInterval) {
    clearInterval(jobRunnerInterval);
    jobRunnerInterval = null;
    console.log('Job runner stopped');
  }
}

/**
 * Execute a specific job step action based on its type
 */
async function executeJobStepAction(step: any): Promise<any> {
  const { typeOfAction, recordType, actionTpl } = step;
  
  // For now, simulate action execution
  // In a real implementation, this would make HubSpot API calls
  
  switch (typeOfAction) {
    case 'create_contact':
      return {
        success: true,
        recordId: `contact_${Date.now()}`,
        action: 'create_contact',
        data: actionTpl,
        timestamp: new Date().toISOString()
      };
      
    case 'create_company':
      return {
        success: true,
        recordId: `company_${Date.now()}`,
        action: 'create_company', 
        data: actionTpl,
        timestamp: new Date().toISOString()
      };
      
    case 'create_deal':
      return {
        success: true,
        recordId: `deal_${Date.now()}`,
        action: 'create_deal',
        data: actionTpl,
        timestamp: new Date().toISOString()
      };
      
    case 'create_note':
      return {
        success: true,
        recordId: `note_${Date.now()}`,
        action: 'create_note',
        data: actionTpl,
        timestamp: new Date().toISOString()
      };
      
    case 'create_ticket':
      return {
        success: true,
        recordId: `ticket_${Date.now()}`,
        action: 'create_ticket',
        data: actionTpl,
        timestamp: new Date().toISOString()
      };
      
    case 'update_deal':
      return {
        success: true,
        recordId: step.recordIdTpl,
        action: 'update_deal',
        data: actionTpl,
        timestamp: new Date().toISOString()
      };
      
    case 'update_ticket':
      return {
        success: true,
        recordId: step.recordIdTpl,
        action: 'update_ticket',
        data: actionTpl,
        timestamp: new Date().toISOString()
      };
      
    case 'close_ticket':
      return {
        success: true,
        recordId: step.recordIdTpl,
        action: 'close_ticket',
        data: actionTpl,
        timestamp: new Date().toISOString()
      };
      
    default:
      throw new Error(`Unknown action type: ${typeOfAction}`);
  }
}

/**
 * Substitute template placeholders with simulation data
 */
function substituteTemplatePlaceholders(template: string, simulation: Simulation): string {
  if (!template) return template;
  
  return template
    .replace(/\{\{theme\}\}/g, simulation.theme || '')
    .replace(/\{\{industry\}\}/g, simulation.industry || '')
    .replace(/\{\{frequency\}\}/g, simulation.frequency || '')
    .replace(/\{\{simulationId\}\}/g, simulation.id.toString())
    .replace(/\{\{userId\}\}/g, simulation.userId.toString())
    .replace(/\{\{timestamp\}\}/g, new Date().toISOString());
}

/**
 * Safely parse JSON strings, return original if not valid JSON
 */
function parseJsonSafely(str: string): any {
  if (!str || str.trim() === '') return {};
  
  try {
    return JSON.parse(str);
  } catch (error) {
    // If not valid JSON, return as object with original string
    return { original: str };
  }
}