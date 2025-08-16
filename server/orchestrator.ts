import { storage } from './storage';
import { Simulation, InsertJob, InsertJobStep } from '../shared/schema';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import OpenAI from 'openai';
import { rateLimiter } from './rate-limiter';
import { personaCache as personaCacheGuardrails, SeededGenerator, LLMValidator, SCHEMA_VERSION } from './llm-guardrails';
import { 
  fetchCrmMetadata, 
  getDealPipelineOptions, 
  getTicketPipelineOptions, 
  getOwnerOptions,
  getDefaultDealPipelineStage,
  getDefaultTicketPipelineStage,
  validateDealPipelineStage,
  validateTicketPipelineStage 
} from './hubspot-metadata';
import { GenerateDataError, TemplateReferenceError, ValidationError } from './errors';
import { logEvent } from './logging';
import { trimStringsDeep, validateDataOrThrow } from './validation';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Persona data cache to avoid repeated LLM calls
const personaCache = new Map<string, any>();

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

// Search fallback configuration
const ENABLE_SEARCH_FALLBACK = process.env.ENABLE_SEARCH_FALLBACK === 'true';

// Add round-robin owner assignment
let currentOwnerIndex = 0;

function getNextOwner(owners: any[]): string | null {
  if (!owners || owners.length === 0) return null;
  
  const owner = owners[currentOwnerIndex % owners.length];
  currentOwnerIndex = (currentOwnerIndex + 1) % owners.length;
  
  return owner.id;
}

/**
 * Determine outcome based on industry-specific win/loss rates
 */
function determineOutcome(industry: string, requestedOutcome?: string): 'won' | 'lost' {
  // If outcome is explicitly requested, use it
  if (requestedOutcome === 'won' || requestedOutcome === 'lost') {
    return requestedOutcome;
  }
  
  // Apply industry-specific win/loss rates
  if (industry?.toLowerCase() === 'ecommerce') {
    // 75% win rate, 25% loss rate for E-commerce
    return Math.random() < 0.75 ? 'won' : 'lost';
  }
  
  // Default 50/50 for other industries
  return Math.random() < 0.5 ? 'won' : 'lost';
}

/**
 * Schedule a simulation job by reading CSV template, computing scaling, and inserting job/steps
 */
export async function scheduleSimulationJob(
  simulation: Simulation, 
  outcome: 'won' | 'lost', 
  acceleratorDays: number,
  contactSeq: number,
  setStartAt: Date
): Promise<{ jobId: number; stepsCount: number }> {
  try {
    const industryKey = simulation.industry?.toLowerCase();
    console.log(`🔍 Industry: '${industryKey}', Outcome: '${outcome}', Duration: ${acceleratorDays} days`);
    
    // Handle Demo Mode - programmatic generation
    if (industryKey === 'demo') {
      console.log('🎮 Demo Mode: Creating programmatic simulation (1 hour duration)');
      return await createDemoModeJob(simulation, outcome, contactSeq, setStartAt);
    }
    
    // Handle E-commerce - CSV templates
    if (industryKey === 'ecommerce' || industryKey === 'business') {
      console.log('🛒 E-commerce Mode: Using CSV templates (90 day simulation)');
      const csvFileName = outcome?.toLowerCase() === 'won' 
        ? 'Ecommerce_Cycle-ClosedWon_1755104746839.csv'
        : 'Ecommerce_Cycle-ClosedLost_1755104746839.csv';
      
      const csvPath = join(process.cwd(), 'attached_assets', csvFileName);
      let csvContent: string;
      
      try {
        csvContent = readFileSync(csvPath, 'utf-8');
        console.log(`✅ Loaded E-commerce template: ${csvFileName}`);
      } catch (error) {
        console.error(`❌ Failed to load E-commerce template: ${csvFileName}`, error);
        throw new Error(`E-commerce template not found: ${csvFileName}`);
      }
      
      // Parse CSV content
      const lines = csvContent.split('\n').filter(line => line.trim());
      const rows: CsvRow[] = [];
      
      console.log(`CSV has ${lines.length} lines including header`);
      
      for (let i = 1; i < lines.length; i++) {
        // Handle CSV parsing with quoted fields that may contain commas
        const line = lines[i];
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim()); // Don't forget the last value
        
        if (values.length >= 7) { // Ensure we have at least the required columns
          rows.push({
            templateDay: parseInt(values[0]) || 0,
            typeOfAction: values[1]?.replace(/"/g, '') || '',
            recordType: values[2]?.replace(/"/g, '') || '',
            recordIdTpl: values[3]?.replace(/"/g, '') || '',
            associationsTpl: values[4]?.replace(/"/g, '') || '',
            originalSource: values[5]?.replace(/"/g, '') || '',
            actionTpl: values[6]?.replace(/"/g, '') || '',
            reasonTpl: values[7]?.replace(/"/g, '') || ''
          });
        }
      }
      
      console.log(`Parsed ${rows.length} rows from E-commerce CSV template`);
      
      // E-commerce templates are already outcome-specific
      const filteredRows = rows;
      console.log(`Using ${filteredRows.length} rows for execution`);
      
      // Guard against empty CSV or missing templateDay values
      if (filteredRows.length === 0) {
        throw new Error("CSV template missing templateDay values");
      }
      
      // Compute dynamic base cycle from CSV data (always 90 days for E-commerce)
      const baseCycleDays = Math.max(...filteredRows.map(row => row.templateDay));
      if (!baseCycleDays || baseCycleDays <= 0) {
        throw new Error("CSV template missing templateDay values");
      }
      
      // For E-commerce, always use 90 days
      const targetCycleDays = 90;
      const baseCycleHours = baseCycleDays * 24;
      const targetCycleHours = targetCycleDays * 24;
      const scalingFactor = targetCycleHours / baseCycleHours;
      
      // Create the job
      const jobData: InsertJob = {
        simulationId: simulation.id,
        outcome,
        theme: simulation.theme,
        industry: simulation.industry,
        contactSeq: contactSeq,
        originalSource: csvFileName,
        acceleratorDays: targetCycleDays.toString(),
        baseCycleDays,
        jobStartAt: setStartAt,
        status: 'pending',
        metadata: {
          scalingFactor,
          originalRowCount: filteredRows.length,
          csvSource: csvFileName,
          usingIndustrySpecificTemplate: true,
          templateType: 'ecommerce-' + outcome
        }
      };

      const createdJob = await storage.createJob(jobData);
    
    // Generate job steps with fractional hour precision
    const jobStepsData: InsertJobStep[] = [];
    
    filteredRows.forEach((row, index) => {
      // Scale timings using fractional hours (not days)
      const scaledHours = row.templateDay * 24 * scalingFactor;
      const scheduledAt = new Date(setStartAt.getTime() + scaledHours * 60 * 60 * 1000);
      
      // Substitute template placeholders with contactSeq
      const substitutedActionTpl = substituteTemplatePlaceholders(row.actionTpl, simulation, contactSeq);
      const substitutedReasonTpl = substituteTemplatePlaceholders(row.reasonTpl, simulation, contactSeq);
      const substitutedRecordIdTpl = substituteTemplatePlaceholders(row.recordIdTpl, simulation, contactSeq);
      
      jobStepsData.push({
        jobId: createdJob.id,
        stepIndex: index + 1,
        templateDay: row.templateDay,
        scaledDay: Math.floor(scaledHours / 24),
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
    }
    
    // If we reach here, unsupported industry
    throw new Error(`Unsupported industry: ${industryKey}. Only 'demo' and 'ecommerce' are currently supported.`);
    
  } catch (error: any) {
    console.error('Error scheduling simulation job:', error);
    throw new Error(`Failed to schedule simulation job: ${error.message}`);
  }
}

/**
 * Create Demo Mode job with programmatic timing
 */
async function createDemoModeJob(
  simulation: Simulation,
  outcome: 'won' | 'lost',
  contactSeq: number,
  setStartAt: Date
): Promise<{ jobId: number; stepsCount: number }> {
  console.log('🎮 Creating Demo Mode job with programmatic timing');
  
  // Demo mode configuration
  const totalSets = Math.min(20, Math.floor((simulation.config?.record_distribution?.contacts || 30) / 1.5));
  const recordsPerSet = {
    contacts: Math.floor((simulation.config?.record_distribution?.contacts || 30) / totalSets),
    companies: Math.floor((simulation.config?.record_distribution?.companies || 30) / totalSets),
    deals: Math.floor((simulation.config?.record_distribution?.deals || 30) / totalSets),
    tickets: Math.floor((simulation.config?.record_distribution?.tickets || 30) / totalSets),
    notes: Math.floor((simulation.config?.record_distribution?.notes || 30) / totalSets)
  };
  
  // Create the job
  const jobData: InsertJob = {
    simulationId: simulation.id,
    outcome,
    theme: simulation.theme,
    industry: simulation.industry,
    contactSeq: contactSeq,
    originalSource: 'demo_mode_programmatic',
    acceleratorDays: '0.042', // 1 hour = 0.042 days
    baseCycleDays: 1,
    jobStartAt: setStartAt,
    status: 'pending',
    metadata: {
      mode: 'demo',
      totalSets,
      recordsPerSet,
      durationHours: 1
    }
  };
  
  const createdJob = await storage.createJob(jobData);
  console.log(`Created Demo Mode job ${createdJob.id} for simulation ${simulation.id}`);
  
  // Generate job steps programmatically
  const jobStepsData: InsertJobStep[] = [];
  let stepIndex = 0;
  
  for (let setNum = 0; setNum < totalSets; setNum++) {
    // First set at 15 seconds, then every 30-90 seconds
    const secondsOffset = setNum === 0 ? 15 : (15 + setNum * (30 + Math.random() * 60));
    const scheduledAt = new Date(setStartAt.getTime() + secondsOffset * 1000);
    
    // Create contact
    if (recordsPerSet.contacts > 0) {
      for (let i = 0; i < recordsPerSet.contacts; i++) {
        jobStepsData.push({
          jobId: createdJob.id,
          stepIndex: ++stepIndex,
          templateDay: 0,
          scaledDay: 0,
          scheduledAt,
          typeOfAction: 'create',
          recordType: 'Contact',
          recordIdTpl: `contact_${setNum}_${i}_{{contactSeq}}`,
          associationsTpl: null,
          originalSource: 'demo',
          actionTpl: null,
          reasonTpl: `Demo set ${setNum + 1}`,
          status: 'pending',
          result: null
        });
      }
    }
    
    // Create company
    if (recordsPerSet.companies > 0) {
      for (let i = 0; i < recordsPerSet.companies; i++) {
        jobStepsData.push({
          jobId: createdJob.id,
          stepIndex: ++stepIndex,
          templateDay: 0,
          scaledDay: 0,
          scheduledAt: new Date(scheduledAt.getTime() + 1000), // 1 second after contact
          typeOfAction: 'create',
          recordType: 'Company',
          recordIdTpl: `company_${setNum}_${i}_{{contactSeq}}`,
          associationsTpl: null,
          originalSource: 'demo',
          actionTpl: null,
          reasonTpl: `Demo set ${setNum + 1}`,
          status: 'pending',
          result: null
        });
      }
    }
    
    // Create deal
    if (recordsPerSet.deals > 0) {
      for (let i = 0; i < recordsPerSet.deals; i++) {
        jobStepsData.push({
          jobId: createdJob.id,
          stepIndex: ++stepIndex,
          templateDay: 0,
          scaledDay: 0,
          scheduledAt: new Date(scheduledAt.getTime() + 2000), // 2 seconds after contact
          typeOfAction: 'create',
          recordType: 'Deal',
          recordIdTpl: `deal_${setNum}_${i}_{{contactSeq}}`,
          associationsTpl: JSON.stringify({
            Contact: [`contact_${setNum}_0_{{contactSeq}}`],
            Company: [`company_${setNum}_0_{{contactSeq}}`]
          }),
          originalSource: 'demo',
          actionTpl: null,
          reasonTpl: `Demo set ${setNum + 1}`,
          status: 'pending',
          result: null
        });
      }
    }
    
    // Create ticket
    if (recordsPerSet.tickets > 0) {
      for (let i = 0; i < recordsPerSet.tickets; i++) {
        jobStepsData.push({
          jobId: createdJob.id,
          stepIndex: ++stepIndex,
          templateDay: 0,
          scaledDay: 0,
          scheduledAt: new Date(scheduledAt.getTime() + 3000), // 3 seconds after contact
          typeOfAction: 'create',
          recordType: 'Ticket',
          recordIdTpl: `ticket_${setNum}_${i}_{{contactSeq}}`,
          associationsTpl: JSON.stringify({
            Contact: [`contact_${setNum}_0_{{contactSeq}}`]
          }),
          originalSource: 'demo',
          actionTpl: null,
          reasonTpl: `Demo set ${setNum + 1}`,
          status: 'pending',
          result: null
        });
      }
    }
    
    // Create note
    if (recordsPerSet.notes > 0) {
      for (let i = 0; i < recordsPerSet.notes; i++) {
        jobStepsData.push({
          jobId: createdJob.id,
          stepIndex: ++stepIndex,
          templateDay: 0,
          scaledDay: 0,
          scheduledAt: new Date(scheduledAt.getTime() + 4000), // 4 seconds after contact
          typeOfAction: 'create',
          recordType: 'Note',
          recordIdTpl: `note_${setNum}_${i}_{{contactSeq}}`,
          associationsTpl: JSON.stringify({
            Contact: [`contact_${setNum}_0_{{contactSeq}}`],
            Deal: [`deal_${setNum}_0_{{contactSeq}}`]
          }),
          originalSource: 'demo',
          actionTpl: null,
          reasonTpl: `Demo set ${setNum + 1}`,
          status: 'pending',
          result: null
        });
      }
    }
  }
  
  // Insert all job steps
  const createdSteps = await storage.createJobSteps(jobStepsData);
  
  console.log(`✅ Created ${createdSteps.length} steps for Demo Mode job ${createdJob.id}`);
  
  return {
    jobId: createdJob.id,
    stepsCount: createdSteps.length
  };
}

/**
 * Search for existing HubSpot contact by email
 */
async function searchContact(email: string, token: string): Promise<{ found: boolean; recordId?: string; ambiguous?: boolean }> {
  try {
    const response = await makeHubSpotRequest('POST', '/crm/v3/objects/contacts/search', {
      filterGroups: [{
        filters: [{
          propertyName: 'email',
          operator: 'EQ',
          value: email
        }]
      }],
      limit: 2 // Get max 2 to detect ambiguous matches
    }, token);

    if (response.results && response.results.length > 0) {
      if (response.results.length === 1) {
        console.log(`Found existing contact: ${email} -> ${response.results[0].id}`);
        return { found: true, recordId: response.results[0].id };
      } else {
        console.log(`Ambiguous contact search for ${email}: ${response.results.length} matches`);
        return { found: true, ambiguous: true };
      }
    }

    return { found: false };
  } catch (error: any) {
    console.error(`Contact search failed for ${email}:`, error.message);
    return { found: false };
  }
}

/**
 * Search for existing HubSpot company by domain
 */
async function searchCompany(domain: string, token: string): Promise<{ found: boolean; recordId?: string; ambiguous?: boolean }> {
  try {
    const response = await makeHubSpotRequest('POST', '/crm/v3/objects/companies/search', {
      filterGroups: [{
        filters: [{
          propertyName: 'domain',
          operator: 'EQ',
          value: domain
        }]
      }],
      limit: 2 // Get max 2 to detect ambiguous matches
    }, token);

    if (response.results && response.results.length > 0) {
      if (response.results.length === 1) {
        console.log(`Found existing company: ${domain} -> ${response.results[0].id}`);
        return { found: true, recordId: response.results[0].id };
      } else {
        console.log(`Ambiguous company search for ${domain}: ${response.results.length} matches`);
        return { found: true, ambiguous: true };
      }
    }

    return { found: false };
  } catch (error: any) {
    console.error(`Company search failed for ${domain}:`, error.message);
    return { found: false };
  }
}

/**
 * Search for existing HubSpot deal by name
 */
async function searchDeal(dealName: string, token: string): Promise<{ found: boolean; recordId?: string; ambiguous?: boolean }> {
  try {
    const response = await makeHubSpotRequest('POST', '/crm/v3/objects/deals/search', {
      filterGroups: [{
        filters: [{
          propertyName: 'dealname',
          operator: 'EQ',
          value: dealName
        }]
      }],
      limit: 2 // Get max 2 to detect ambiguous matches
    }, token);

    if (response.results && response.results.length > 0) {
      if (response.results.length === 1) {
        console.log(`Found existing deal: ${dealName} -> ${response.results[0].id}`);
        return { found: true, recordId: response.results[0].id };
      } else {
        console.log(`Ambiguous deal search for ${dealName}: ${response.results.length} matches`);
        return { found: true, ambiguous: true };
      }
    }

    return { found: false };
  } catch (error: any) {
    console.error(`Deal search failed for ${dealName}:`, error.message);
    return { found: false };
  }
}

/**
 * Resolve template references in recordIdTpl and associationsTpl using job context
 * Enhanced with search fallback when references are missing
 */
async function resolveTemplateReferences(
  jobId: number, 
  recordIdTpl: string, 
  associationsTpl: any,
  stepData?: any,
  token?: string,
  correlationId?: string
): Promise<{ resolvedRecordId: string; resolvedAssociations: any }> {
  // Get job context (mapping of template IDs to actual CRM IDs)
  const context = await storage.getJobContext(jobId);
  const strictTemplateRefs = process.env.STRICT_TEMPLATE_REFS === 'true';
  
  // Resolve recordIdTpl
  let resolvedRecordId = recordIdTpl;
  if (recordIdTpl && context[recordIdTpl]) {
    resolvedRecordId = context[recordIdTpl];
    console.log(`✓ Resolved recordIdTpl "${recordIdTpl}" -> "${resolvedRecordId}"`);
  } else if (recordIdTpl && strictTemplateRefs) {
    // In strict mode, throw error for unresolved template references
    logEvent('error', correlationId || 'unknown', 'template.resolve.error', {
      ref: recordIdTpl,
      reason: 'Missing template reference',
      SCHEMA_VERSION
    });
    
    throw new TemplateReferenceError('TEMPLATE_REF_MISSING', 'Missing template reference', {
      correlationId: correlationId || 'unknown',
      ref: recordIdTpl
    });
  }
  
  // Resolve associationsTpl - replace template references with actual IDs
  let resolvedAssociations = associationsTpl;
  if (associationsTpl && typeof associationsTpl === 'object') {
    resolvedAssociations = JSON.parse(JSON.stringify(associationsTpl)); // Deep copy
    
    // Recursively resolve template references in associations
    const resolveInObject = async (obj: any): Promise<any> => {
      if (typeof obj === 'string' && context[obj]) {
        console.log(`✓ Resolved association "${obj}" -> "${context[obj]}"`);
        return context[obj];
      } else if (typeof obj === 'string' && obj.startsWith('{{') && obj.endsWith('}}')) {
        // This is a template reference that couldn't be resolved
        if (ENABLE_SEARCH_FALLBACK && token && stepData) {
          // Try search fallback for missing template references
          const searchResult = await searchFallbackForTemplate(obj, stepData, token);
          if (searchResult.found && searchResult.recordId) {
            // Cache the found ID in context for future use
            await storeRecordIdInContext(jobId, obj, searchResult.recordId);
            console.log(`✓ Search fallback resolved "${obj}" -> "${searchResult.recordId}"`);
            return searchResult.recordId;
          }
        }
        
        // If search fallback is disabled or failed, and strict mode is enabled
        if (strictTemplateRefs) {
          logEvent('error', correlationId || 'unknown', 'template.resolve.error', {
            ref: obj,
            reason: 'Missing template reference (search fallback disabled or failed)',
            SCHEMA_VERSION
          });
          
          throw new TemplateReferenceError('TEMPLATE_REF_MISSING', 'Missing template reference', {
            correlationId: correlationId || 'unknown',
            ref: obj
          });
        }
        
        // In non-strict mode, keep current behavior (return unresolved)
        return obj;
      } else if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          obj[key] = await resolveInObject(obj[key]);
        }
      }
      return obj;
    };
    
    resolvedAssociations = await resolveInObject(resolvedAssociations);
  }
  
  return { resolvedRecordId, resolvedAssociations };
}

/**
 * Search fallback for missing template references
 */
async function searchFallbackForTemplate(
  templateRef: string, 
  stepData: any, 
  token: string
): Promise<{ found: boolean; recordId?: string; ambiguous?: boolean }> {
  // Determine search type based on template reference pattern
  if (templateRef.includes('contact_') && stepData.email) {
    return await searchContact(stepData.email, token);
  } else if (templateRef.includes('company_') && stepData.domain) {
    return await searchCompany(stepData.domain, token);
  } else if (templateRef.includes('deal_') && stepData.dealname) {
    return await searchDeal(stepData.dealname, token);
  }
  
  return { found: false };
}

/**
 * Store a newly created record ID in job context for future reference
 */
async function storeRecordIdInContext(
  jobId: number, 
  recordIdTpl: string, 
  actualCrmId: string
): Promise<void> {
  const context = await storage.getJobContext(jobId);
  context[recordIdTpl] = actualCrmId;
  await storage.updateJobContext(jobId, context);
  console.log(`💾 Stored in context: "${recordIdTpl}" -> "${actualCrmId}"`);
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

        // Get HubSpot token for search operations
        const job = await getJobById(step.jobId);
        const hubspotToken = await getHubSpotToken(job.simulationId);
        
        // Create correlation ID for template resolution
        const correlationId = `${step.jobId}-${step.stepIndex}`;

        // Resolve template references before execution (with search fallback)
        const { resolvedRecordId, resolvedAssociations } = await resolveTemplateReferences(
          step.jobId, 
          step.recordIdTpl || '', 
          step.associationsTpl || {},
          step.actionTpl || undefined,
          hubspotToken || undefined,
          correlationId
        );
        
        // Create enhanced step with resolved references
        const enhancedStep = {
          ...step,
          recordIdTpl: resolvedRecordId,
          associationsTpl: resolvedAssociations
        };

        // Execute the action based on step type
        const result = await executeJobStepAction(enhancedStep);
        
        // Mark as completed with result
        if (result.success) {
          // Store the created record ID in context for future steps
          if (result.recordId && step.recordIdTpl && step.typeOfAction?.startsWith('create_')) {
            await storeRecordIdInContext(step.jobId, step.recordIdTpl, result.recordId);
          }
          
          await storage.updateJobStepStatus(step.id, 'completed', result);
          successful++;
        } else {
          // Check if this is a non-retryable failure (e.g., validation error)
          const status = result.nonRetryable ? 'failed_non_retryable' : 'failed';
          await storage.updateJobStepStatus(step.id, status, result);
          failed++;
          
          // Log validation errors more prominently
          if (result.nonRetryable) {
            console.error(`❌ Non-retryable failure for step ${step.id} (${step.typeOfAction}): ${result.error}`);
          }
        }
        
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
  const { typeOfAction, recordType, actionTpl, jobId } = step;
  
  try {
    // Get job details for theme/industry context
    const job = await getJobById(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    // Get HubSpot API token for the user
    const hubspotToken = await getHubSpotToken(job.simulationId);
    if (!hubspotToken) {
      throw new Error('HubSpot API token not found. Please connect HubSpot account.');
    }
    
    // Get simulation details to find user ID
    const simulation = await storage.getSimulationById(job.simulationId);
    if (!simulation) {
      throw new Error('Simulation not found');
    }
    
    // Fetch CRM metadata for pipeline/stage validation
    let crmMetadata = null;
    if (['create_deal', 'update_deal', 'create_ticket', 'update_ticket', 'close_ticket'].includes(typeOfAction)) {
      try {
        crmMetadata = await fetchCrmMetadata(hubspotToken, simulation.userId);
        console.log(`📊 Fetched CRM metadata for ${typeOfAction}`);
      } catch (error: any) {
        console.warn(`⚠️ Could not fetch CRM metadata: ${error.message}. Using fallback values.`);
        // Continue without metadata - LLM will use fallback values
      }
    }
    
    // Generate realistic data using LLM based on theme/industry with CRM metadata
    const generatedData = await generateRealisticData(
      typeOfAction, 
      job.theme, 
      job.industry, 
      actionTpl,
      jobId,
      step.stepIndex,
      true, // useSeed
      crmMetadata
    );
    
    // Add required fields that LLM doesn't generate but validation expects
    const enrichedData = { ...generatedData };
    
    // Add default values for required fields based on action type
    if (typeOfAction === 'create_contact') {
      enrichedData.lifecycleStage = enrichedData.lifecycleStage || 'lead';
    } else if (typeOfAction === 'create_company') {
      enrichedData.lifecycleStage = enrichedData.lifecycleStage || 'lead';
      enrichedData.country = enrichedData.country || 'United States';
    } else if (typeOfAction === 'create_deal') {
      enrichedData.closedate = enrichedData.closedate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    
    // For update/close operations, resolve template references first
    let resolvedStep = step;
    if (['update_deal', 'update_ticket', 'close_ticket', 'Update', 'update'].includes(typeOfAction)) {
      try {
        console.log(`🔧 Resolving template references for ${typeOfAction}: ${step.recordIdTpl}`);
        const { resolvedRecordId, resolvedAssociations } = await resolveTemplateReferences(
          jobId,
          step.recordIdTpl,
          step.associationsTpl || {},
          generatedData,
          hubspotToken,
          job.id?.toString()
        );
        
        // Create a new step object with resolved references
        resolvedStep = {
          ...step,
          recordIdTpl: resolvedRecordId,
          associationsTpl: resolvedAssociations
        };
        
        console.log(`✅ Template resolution successful: ${step.recordIdTpl} -> ${resolvedRecordId}`);
      } catch (error: any) {
        console.error(`❌ Template resolution failed for ${step.recordIdTpl}: ${error.message}`);
        return {
          success: false,
          error: `Template resolution failed: ${error.message}`,
          action: typeOfAction,
          timestamp: new Date().toISOString(),
          nonRetryable: true
        };
      }
    }

    // Execute the specific action
    switch (typeOfAction) {
      case 'create_contact':
        return await executeCreateContact(enrichedData, hubspotToken, step);
        
      case 'create_company':
        return await executeCreateCompany(enrichedData, hubspotToken, step);
        
      case 'create_deal':
        return await executeCreateDeal(generatedData, hubspotToken, step);
        
      case 'create_note':
        return await executeCreateNote(generatedData, hubspotToken, step);
        
      case 'create_ticket':
        return await executeCreateTicket(generatedData, hubspotToken, step);
        
      case 'update_deal':
        return await executeUpdateDeal(generatedData, hubspotToken, resolvedStep);
        
      case 'update_ticket':
        return await executeUpdateTicket(generatedData, hubspotToken, resolvedStep);
        
      case 'close_ticket':
        return await executeCloseTicket(generatedData, hubspotToken, resolvedStep);
        
      case 'Update':
      case 'update':
        // Handle generic update actions - determine record type and route appropriately
        console.log(`📝 Processing generic update action for record type: ${recordType}`);
        if (recordType === 'Opportunity' || recordType === 'Deal') {
          return await executeUpdateDeal(generatedData, hubspotToken, resolvedStep);
        } else if (recordType === 'Ticket') {
          return await executeUpdateTicket(generatedData, hubspotToken, resolvedStep);
        } else if (recordType === 'Contact') {
          // For now, log and skip contact updates (could implement later)
          console.log(`⏭️ Skipping contact update - not implemented yet`);
          return {
            success: true,
            recordId: 'skipped',
            action: 'update_contact_skipped',
            message: 'Contact updates not implemented',
            timestamp: new Date().toISOString()
          };
        } else if (recordType === 'Company') {
          // For now, log and skip company updates (could implement later)
          console.log(`⏭️ Skipping company update - not implemented yet`);
          return {
            success: true,
            recordId: 'skipped',
            action: 'update_company_skipped',
            message: 'Company updates not implemented',
            timestamp: new Date().toISOString()
          };
        } else {
          console.warn(`⚠️ Unknown record type for update: ${recordType}`);
          return {
            success: false,
            error: `Unknown record type for update: ${recordType}`,
            action: 'update_unknown',
            timestamp: new Date().toISOString()
          };
        }
        
      case 'create':
        // Handle generic create actions - determine record type and route appropriately
        console.log(`📝 Processing generic create action for record type: ${recordType}`);
        if (recordType === 'Contact') {
          return await executeCreateContact(enrichedData, hubspotToken, step);
        } else if (recordType === 'Company') {
          return await executeCreateCompany(enrichedData, hubspotToken, step);
        } else if (recordType === 'Opportunity' || recordType === 'Deal') {
          return await executeCreateDeal(generatedData, hubspotToken, step);
        } else if (recordType === 'Note') {
          return await executeCreateNote(generatedData, hubspotToken, step);
        } else if (recordType === 'Ticket') {
          return await executeCreateTicket(generatedData, hubspotToken, step);
        } else {
          console.warn(`⚠️ Unknown record type for create: ${recordType}`);
          return {
            success: false,
            error: `Unknown record type for create: ${recordType}`,
            action: 'create_unknown',
            timestamp: new Date().toISOString()
          };
        }
        
      default:
        throw new Error(`Unknown action type: ${typeOfAction}`);
    }
    
  } catch (error: any) {
    // Create correlation ID for error logging
    const correlationId = step.seed || `${step.jobId}-${step.stepIndex}`;
    
    console.error(`Error executing job step ${step.id}:`, error.message);
    
    // Handle specific error types as non-retryable
    if (error instanceof GenerateDataError) {
      logEvent('error', correlationId, 'generate.llm.error', {
        code: error.code,
        context: error.context,
        SCHEMA_VERSION
      });
      return {
        success: false,
        nonRetryable: true,
        error: error.message,
        code: error.code,
        action: typeOfAction,
        correlationId,
        timestamp: new Date().toISOString()
      };
    }
    
    if (error instanceof TemplateReferenceError) {
      logEvent('error', correlationId, 'template.resolve.error', {
        code: error.code,
        context: error.context,
        SCHEMA_VERSION
      });
      return {
        success: false,
        nonRetryable: true,
        error: error.message,
        code: error.code,
        action: typeOfAction,
        correlationId,
        timestamp: new Date().toISOString()
      };
    }
    
    if (error instanceof ValidationError) {
      logEvent('error', correlationId, 'generate.validate.error', {
        code: error.code,
        context: error.context,
        SCHEMA_VERSION
      });
      return {
        success: false,
        nonRetryable: true,
        error: error.message,
        code: error.code,
        action: typeOfAction,
        correlationId,
        timestamp: new Date().toISOString()
      };
    }
    
    // Default retryable error
    return {
      success: false,
      error: error.message,
      action: typeOfAction,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Substitute template placeholders with simulation data
 */
function substituteTemplatePlaceholders(template: string, simulation: Simulation, contactSeq?: number): string {
  if (!template) return template;
  
  return template
    .replace(/\{\{theme\}\}/g, simulation.theme || '')
    .replace(/\{\{industry\}\}/g, simulation.industry || '')
    .replace(/\{\{frequency\}\}/g, simulation.frequency || '')
    .replace(/\{\{simulationId\}\}/g, simulation.id.toString())
    .replace(/\{\{userId\}\}/g, simulation.userId.toString())
    .replace(/\{\{contact_seq\}\}/g, String(contactSeq || 1))
    .replace(/\{\{timestamp\}\}/g, new Date().toISOString());
}

// Updated system prompt for better handling of fictional themes
const SYSTEM_PROMPT = "You are an expert CRM data generator for the SimCRM application. Generate consistent and appropriate data that fits the specified theme and industry. The theme may be fictional (like TV shows, movies, music) or real-world. Respond with valid JSON only. Follow the exact schema requirements and ensure all required fields are present with the correct data types.";

/**
 * Generate realistic data using LLM based on theme, industry, and action template
 */
async function generateRealisticData(
  actionType: string, 
  theme: string, 
  industry: string, 
  actionTemplate: any,
  jobId?: number,
  stepIndex?: number,
  useSeed = true,
  crmMetadata?: any
): Promise<any> {
  // Environment flags
  const strictGeneration = process.env.STRICT_GENERATION !== 'false'; // default true
  const actionScopedCache = process.env.ACTION_SCOPED_CACHE !== 'false'; // default true
  
  // Generate deterministic seed and correlation ID
  const seed = useSeed && jobId ? SeededGenerator.generateSeed(jobId, theme, industry, stepIndex) : undefined;
  const correlationId = seed || SeededGenerator.generateSeed(jobId!, theme, industry, stepIndex);
  
  // Build action-scoped cache key if enabled
  const cacheSeed = actionScopedCache && seed ? `${seed}:${actionType}` : actionType;
  
  // Log generation start
  logEvent('info', correlationId, 'generate.start', {
    actionType,
    theme,
    industry,
    inputHash: hashInputs({ actionType, theme, industry, template: actionTemplate }),
    SCHEMA_VERSION
  });
  
  // Check cache with action-scoped key
  const cachedData = personaCacheGuardrails.get(theme, industry, cacheSeed);
  if (cachedData) {
    // Calculate TTL remaining
    const cacheStats = personaCacheGuardrails.getStats();
    const cacheEntry = cacheStats.entries.find(entry => 
      entry.key === `${theme.toLowerCase()}:${industry.toLowerCase()}:${cacheSeed}`
    );
    const ttlRemaining = cacheEntry ? Math.max(0, cacheEntry.expiresAt - Date.now()) : undefined;
    
    logEvent('info', correlationId, 'generate.cacheCheck', {
      result: 'hit',
      ttlRemaining,
      SCHEMA_VERSION
    });
    
    try {
      // Deep clone result to avoid mutation
      const clone = JSON.parse(JSON.stringify(cachedData));
      
      // Re-validate cached data
      validateDataOrThrow(clone, actionType);
      
      // Remove internal fields before returning
      delete clone.generated_at;
      delete clone.generatedAt;
      delete (clone as any).metadata;
      
      return clone;
    } catch (validationError) {
      // Invalid cached data - evict and treat as miss
      personaCacheGuardrails.delete(theme, industry, cacheSeed);
      logEvent('warn', correlationId, 'cache.error', {
        action: 'evictInvalid',
        reason: validationError instanceof Error ? validationError.message : 'Validation failed',
        SCHEMA_VERSION
      });
    }
  }
  
  // Log cache miss
  logEvent('info', correlationId, 'generate.cacheCheck', {
    result: 'miss',
    SCHEMA_VERSION
  });
  
  try {
    let basePrompt = createLLMPrompt(actionType, theme, industry, actionTemplate, crmMetadata);
    
    // Add seeded generation instruction
    if (seed) {
      basePrompt = SeededGenerator.createSeededPrompt(basePrompt, seed);
      console.log(`🎲 Generating with seed: ${seed}`);
    }
    
    // Log LLM request with enhanced details
    console.log(`🚀 LLM REQUEST: ${actionType} for ${theme}/${industry}`);
    console.log(`📝 System Prompt: ${SYSTEM_PROMPT.slice(0, 100)}...`);
    console.log(`📝 User Prompt: ${basePrompt.slice(0, 200)}...`);
    
    logEvent('info', correlationId, 'generate.llm.request', {
      model: 'gpt-5-nano', // primary model
      promptLength: basePrompt.length,
      actionType,
      theme,
      industry,
      SCHEMA_VERSION
    });
    
    // Try primary model first with rate limiting
    let response;
    try {
      response = await rateLimiter.executeWithRateLimit('openai', async () => {
        return await openai.chat.completions.create({
          model: "gpt-5-nano",
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT
            },
            {
              role: "user",
              content: basePrompt
            }
          ],
          response_format: { type: "json_object" }
        });
      }, {
        onRetry: (attempt, error) => {
          console.log(`🔄 OpenAI API retry ${attempt + 1} for gpt-5-nano: ${error.message}`);
        },
        onRateLimit: (delayMs) => {
          console.log(`🚦 OpenAI rate limit triggered. Backing off for ${delayMs}ms`);
        }
      });
    } catch (primaryError: any) {
      console.warn(`Primary model gpt-5-nano failed: ${primaryError.message}. Trying fallback model.`);
      
      // Log fallback attempt
      logEvent('warn', correlationId, 'generate.llm.error', {
        model: 'gpt-5-nano',
        error: primaryError.message,
        fallbackAttempt: true,
        SCHEMA_VERSION
      });
      
      // Fallback to secondary model with rate limiting
      response = await rateLimiter.executeWithRateLimit('openai', async () => {
        return await openai.chat.completions.create({
          model: "gpt-5-nano",
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT
            },
            {
              role: "user",
              content: basePrompt
            }
          ],
          response_format: { type: "json_object" }
        });
      }, {
        onRetry: (attempt, error) => {
          console.log(`🔄 OpenAI API retry ${attempt + 1} for gpt-4.1-nano: ${error.message}`);
        },
        onRateLimit: (delayMs) => {
          console.log(`🚦 OpenAI fallback rate limit triggered. Backing off for ${delayMs}ms`);
        }
      });
    }

    // Log LLM response with enhanced details
    const responseContent = response.choices[0].message.content || '{}';
    console.log(`🤖 LLM RESPONSE: ${responseContent}`);
    
    logEvent('info', correlationId, 'generate.llm.response', {
      textLength: responseContent.length,
      finishReason: response.choices[0].finish_reason,
      responseContent: responseContent.slice(0, 500),
      SCHEMA_VERSION
    });

    let rawData;
    try {
      rawData = JSON.parse(responseContent);
      logEvent('info', correlationId, 'generate.parse.success', { SCHEMA_VERSION });
    } catch (parseError) {
      logEvent('error', correlationId, 'generate.parse.error', {
        error: parseError instanceof Error ? parseError.message : 'Parse failed',
        rawSample: responseContent.slice(0, 200),
        SCHEMA_VERSION
      });
      
      if (strictGeneration) {
        throw new GenerateDataError('LLM_PARSE_FAILED', 'Failed to parse LLM response as JSON', {
          correlationId,
          theme,
          industry,
          actionType,
          templateId: actionTemplate?.recordIdTpl,
          rawSample: responseContent.slice(0, 200)
        });
      }
      // Non-strict fallback - use template
      return actionTemplate || {};
    }
    
    // Validate generated data with guardrails
    const validation = LLMValidator.validateGeneratedData(rawData, theme, industry);
    
    if (!validation.isValid) {
      logEvent('error', correlationId, 'generate.validate.error', {
        errors: validation.errors,
        SCHEMA_VERSION
      });
      
      console.error(`❌ LLM validation failed for ${theme} + ${industry}:`, validation.errors);
      
      // Attempt auto-fix for common issues
      const autoFix = LLMValidator.attemptAutoFix(rawData);
      
      if (autoFix.fixed) {
        console.log(`🔧 Auto-fixed LLM output:`, autoFix.changes);
        
        // Re-validate after auto-fix
        const revalidation = LLMValidator.validateGeneratedData(autoFix.data, theme, industry);
        
        if (revalidation.isValid) {
          // Remove internal fields before caching and returning
          const cleanData = { ...revalidation.validatedData };
          delete cleanData.generated_at;
          delete cleanData.generatedAt;
          delete (cleanData as any).metadata;
          
          // Cache the validated and fixed data
          personaCacheGuardrails.set(theme, industry, cleanData, cacheSeed);
          
          logEvent('info', correlationId, 'generate.validate.success', {
            afterAutoFix: true,
            SCHEMA_VERSION
          });
          
          console.log(`✅ LLM output validated and cached after auto-fix`);
          return cleanData;
        }
      }
      
      // If validation still fails and strict mode is enabled, throw error
      if (strictGeneration) {
        throw new GenerateDataError('LLM_GENERATION_FAILED', 'LLM call/parse/validation failed', {
          correlationId,
          theme,
          industry,
          actionType,
          templateId: actionTemplate?.recordIdTpl,
          rawSample: responseContent.slice(0, 200)
        });
      }
      
      // Non-strict fallback
      return actionTemplate || {};
    }
    
    // Log validation success
    logEvent('info', correlationId, 'generate.validate.success', { SCHEMA_VERSION });
    
    // Log warnings but continue
    if (validation.warnings.length > 0) {
      console.warn(`⚠️ LLM validation warnings:`, validation.warnings);
    }
    
    // Use the raw validated data directly, not validation.validatedData
    // The validation.validatedData might be modifying the structure incorrectly
    const cleanData = { ...rawData };
    delete cleanData.generated_at;
    delete cleanData.generatedAt;
    delete (cleanData as any).metadata;
    
    console.log(`🤖 Generated LLM data for ${actionType}:`, JSON.stringify(cleanData, null, 2));
    
    // Cache the validated data
    personaCacheGuardrails.set(theme, industry, cleanData, cacheSeed);
    
    console.log(`✅ LLM output validated and cached successfully`);
    return cleanData;
    
  } catch (error: any) {
    // Log LLM error
    logEvent('error', correlationId, 'generate.llm.error', {
      error: error.message,
      SCHEMA_VERSION
    });
    
    console.error('Error generating realistic data with LLM (both models failed):', error.message);
    
    // Re-throw specific errors in strict mode
    if (strictGeneration && (error instanceof GenerateDataError || error instanceof ValidationError)) {
      throw error;
    }
    
    // Fallback to template data if not in strict mode
    if (strictGeneration) {
      throw new GenerateDataError('LLM_GENERATION_FAILED', 'LLM call/parse/validation failed', {
        correlationId,
        theme,
        industry,
        actionType,
        templateId: actionTemplate?.recordIdTpl,
        rawSample: error.message?.slice(0, 200)
      });
    }
    
    return actionTemplate || {};
  }
}

/**
 * Helper function to hash inputs for logging
 */
function hashInputs(inputs: any): string {
  return createHash('md5').update(JSON.stringify(inputs)).digest('hex').slice(0, 8);
}

/**
 * Create LLM prompt based on action type, theme, and industry
 */
function createLLMPrompt(actionType: string, theme: string, industry: string, template: any, crmMetadata?: any): string {
  const basePrompt = `Generate appropriate ${actionType.replace('_', ' ')} data for a ${theme}-themed ${industry} simulation that maintains internal consistency.`;
  
  switch (actionType) {
    case 'create_contact':
      return `${basePrompt} You MUST return complete contact data in valid JSON format. Include ALL required fields with realistic values:
      
      Example expected output:
      {
        "firstName": "John",
        "lastName": "Smith", 
        "email": "john.smith@techcorp.com",
        "phone": "+1-555-123-4567",
        "jobTitle": "Software Engineer",
        "company": "TechCorp Inc"
      }
      
      Generate a complete contact that fits the ${theme} theme with ALL these fields populated.`;
      
    case 'create_company':
      return `${basePrompt} You MUST return complete company data in valid JSON format. Include ALL required fields with realistic values:
      
      Example expected output:
      {
        "name": "TechCorp Inc",
        "domain": "techcorp.com", 
        "city": "San Francisco",
        "state": "California",
        "industry": "Software",
        "numberofemployees": 150
      }
      
      Generate a complete company that fits the ${theme} theme with ALL these fields populated.`;
      
    case 'create_deal':
      let dealPrompt = `${basePrompt} You MUST return complete deal data in valid JSON format. Include ALL required fields with realistic values.`;
      if (crmMetadata) {
        dealPrompt += `\n\nIMPORTANT - Use ONLY these exact pipeline and stage IDs from the target CRM:\n${getDealPipelineOptions(crmMetadata)}`;
        dealPrompt += `\n\nDO NOT append any suffixes, seeds, or random values to the pipeline/stage IDs.`;
        dealPrompt += `\n\nExample expected output:\n{"dealname": "Enterprise Software License", "amount": 25000, "dealstage": "[USE_EXACT_STAGE_ID]", "pipeline": "[USE_EXACT_PIPELINE_ID]"}`;
      } else {
        dealPrompt += `\n\nExample expected output:\n{"dealname": "Enterprise Software License", "amount": 25000, "dealstage": "appointmentscheduled", "pipeline": "default"}`;
        dealPrompt += `\n\nDO NOT modify or append anything to these exact values.`;
      }
      return dealPrompt;
      
    case 'create_note':
      return `${basePrompt} Create a professional note body that fits the ${theme}. Keep it under 200 characters. Return JSON with: {"hs_note_body": ""}`;
      
    case 'create_ticket':
      let ticketPrompt = `${basePrompt} Create a support ticket with subject and content that fits the ${theme}.`;
      if (crmMetadata) {
        ticketPrompt += `\n\nIMPORTANT - Use ONLY these exact pipeline and stage IDs from the target CRM:\n${getTicketPipelineOptions(crmMetadata)}`;
        ticketPrompt += `\n\nReturn JSON with: {"subject": "", "content": "", "hs_pipeline_stage": "[USE_EXACT_STAGE_ID]", "hs_pipeline": "[USE_EXACT_PIPELINE_ID]"}`;
      } else {
        ticketPrompt += ` Return JSON with: {"subject": "", "content": "", "hs_pipeline_stage": "1", "hs_pipeline": "0"}`;
      }
      return ticketPrompt;
      
    case 'update_deal':
      let updateDealPrompt = `${basePrompt} Create data to update a deal that fits the ${theme} theme.`;
      if (crmMetadata) {
        updateDealPrompt += `\n\nIMPORTANT - Use ONLY these exact stage IDs from the target CRM:\n${getDealPipelineOptions(crmMetadata)}`;
        updateDealPrompt += `\n\nDO NOT append any suffixes, seeds, or random values to the stage IDs.`;
        updateDealPrompt += `\n\nReturn JSON with stage update: {"dealstage": "[USE_EXACT_STAGE_ID]"}`;
      } else {
        updateDealPrompt += ` Return JSON with stage update: {"dealstage": "closedwon"}`;
        updateDealPrompt += `\n\nDO NOT modify or append anything to these exact values.`;
      }
      return updateDealPrompt;
      
    case 'update_ticket':
      let updateTicketPrompt = `${basePrompt} Create data to update a support ticket that fits the ${theme} theme.`;
      if (crmMetadata) {
        updateTicketPrompt += `\n\nIMPORTANT - Use ONLY these exact stage IDs from the target CRM:\n${getTicketPipelineOptions(crmMetadata)}`;
        updateTicketPrompt += `\n\nReturn JSON with: {"hs_pipeline_stage": "[USE_EXACT_STAGE_ID]"}`;
      } else {
        updateTicketPrompt += ` Return JSON with: {"hs_pipeline_stage": "2"}`;
      }
      return updateTicketPrompt;
      
    case 'close_ticket':
      let closeTicketPrompt = `${basePrompt} Create data to close a support ticket.`;
      if (crmMetadata) {
        closeTicketPrompt += `\n\nIMPORTANT - Use ONLY these exact stage IDs that represent "closed" status from the target CRM:\n${getTicketPipelineOptions(crmMetadata)}`;
        closeTicketPrompt += `\n\nReturn JSON with: {"hs_pipeline_stage": "[USE_EXACT_CLOSED_STAGE_ID]"}`;
      } else {
        closeTicketPrompt += ` Return JSON with: {"hs_pipeline_stage": "3"}`;
      }
      return closeTicketPrompt;
      
    default:
      return `${basePrompt} Generate appropriate data in JSON format.`;
  }
}

/**
 * Add variation to cached persona data to avoid identical records
 */
function addVariationToPersonaData(cachedData: any, actionType: string): any {
  const data = { ...cachedData };
  const timestamp = Date.now();
  
  switch (actionType) {
    case 'create_contact':
      if (data.email) {
        data.email = data.email.replace('@', `+${timestamp}@`);
      }
      break;
    case 'create_company':
      if (data.name) {
        data.name = `${data.name} ${Math.floor(timestamp / 1000)}`;
      }
      break;
    case 'create_deal':
      if (data.dealname) {
        data.dealname = `${data.dealname} #${Math.floor(timestamp / 1000)}`;
      }
      break;
  }
  
  return data;
}

/**
 * Get job by ID from storage
 */
async function getJobById(jobId: number): Promise<any> {
  try {
    const job = await storage.getJobById(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    return job;
  } catch (error) {
    throw new Error(`Unable to fetch job ${jobId}`);
  }
}

/**
 * Get HubSpot API token for user
 */
async function getHubSpotToken(simulationId: number): Promise<string | null> {
  try {
    // Get simulation to find user ID
    const simulation = await storage.getSimulationById(simulationId);
    if (!simulation) {
      throw new Error('Simulation not found');
    }
    
    // Get HubSpot token from user's session
    const session = await storage.getSession(simulation.userId);
    return session?.hubspotToken || null;
  } catch (error) {
    console.error('Error getting HubSpot token:', error);
    return null;
  }
}

/**
 * Execute contact creation with deduplication
 */
async function executeCreateContact(data: any, token: string, step?: any): Promise<any> {
  // Check for existing contact if search fallback is enabled and email exists
  if (ENABLE_SEARCH_FALLBACK && data.email) {
    const searchResult = await searchContact(data.email, token);
    
    if (searchResult.found) {
      if (searchResult.ambiguous) {
        return {
          success: false,
          error: `Ambiguous contact match for email: ${data.email}`,
          action: 'create_contact',
          timestamp: new Date().toISOString()
        };
      } else if (searchResult.recordId) {
        console.log(`🔍 Deduplication: Using existing contact ${searchResult.recordId} for ${data.email}`);
        return {
          success: true,
          recordId: searchResult.recordId,
          action: 'create_contact',
          data: data,
          deduplicated: true,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  // Resolve owner email to HubSpot owner ID if provided
  let resolvedData = data;
  if (step?.jobId) {
    const job = await getJobById(step.jobId);
    resolvedData = await resolveOwnerEmail(job.simulationId, data, token);
  } else {
    // For direct creation, assign owner if not provided
    if (!resolvedData.hubspot_owner_id) {
      const owners = await storage.getHubspotOwners(0); // Use default userId for direct creation
      const nextOwnerId = getNextOwner(owners);
      if (nextOwnerId) {
        resolvedData.hubspot_owner_id = nextOwnerId;
        console.log(`👤 Round-robin: Assigned owner ${nextOwnerId} to contact`);
      }
    }
  }
  
  // Remove generatedAt property if present (HubSpot doesn't allow camelCase)
  delete resolvedData.generatedAt;
  delete resolvedData.generated_at; // Also remove snake_case version from record data

  // Pre-persistence validation (if enabled)
  let validatedData = resolvedData;
  // Skip the strict validation that expects a specific schema structure
  // The LLM generates plain objects, not the complex personas array structure
  validatedData = trimStringsDeep(validatedData);
  
  // Remove internal fields
  delete validatedData.generatedAt;
  delete validatedData.generated_at;
  delete (validatedData as any).metadata;

  // Legacy validation and coercion
  const { validData: legacyValidatedData, errors } = validateAndCoerceRecordData(validatedData, 'contacts');
  if (errors.length > 0) {
    console.warn(`⚠️ Data validation warnings for contact:`, errors);
  }

  console.log(`📝 Creating contact with data:`, JSON.stringify(legacyValidatedData, null, 2));

  // Validate and ensure properties exist
  await ensureHubSpotProperties('contacts', Object.keys(legacyValidatedData), token, legacyValidatedData);
  
  // Convert property names to HubSpot-compatible format
  const hubspotData = convertPropertiesToHubSpotFormat(legacyValidatedData);
  
  // Create contact via HubSpot API
  const response = await makeHubSpotRequest('POST', '/crm/v3/objects/contacts', {
    properties: hubspotData
  }, token);
  
  return {
    success: true,
    recordId: response.id,
    action: 'create_contact',
    data: response.properties,
    hubspotResponse: response,
    timestamp: new Date().toISOString()
  };
}

/**
 * Execute company creation with deduplication
 */
async function executeCreateCompany(data: any, token: string, step?: any): Promise<any> {
  // Check for existing company if search fallback is enabled and domain exists
  if (ENABLE_SEARCH_FALLBACK && data.domain) {
    const searchResult = await searchCompany(data.domain, token);
    
    if (searchResult.found) {
      if (searchResult.ambiguous) {
        return {
          success: false,
          error: `Ambiguous company match for domain: ${data.domain}`,
          action: 'create_company',
          timestamp: new Date().toISOString()
        };
      } else if (searchResult.recordId) {
        console.log(`🔍 Deduplication: Using existing company ${searchResult.recordId} for ${data.domain}`);
        return {
          success: true,
          recordId: searchResult.recordId,
          action: 'create_company',
          data: data,
          deduplicated: true,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  // Resolve owner email to HubSpot owner ID if provided
  let resolvedData = data;
  if (step?.jobId) {
    const job = await getJobById(step.jobId);
    resolvedData = await resolveOwnerEmail(job.simulationId, data, token);
  } else {
    // For direct creation, assign owner if not provided
    if (!resolvedData.hubspot_owner_id) {
      const owners = await storage.getHubspotOwners(0); // Use default userId for direct creation
      const nextOwnerId = getNextOwner(owners);
      if (nextOwnerId) {
        resolvedData.hubspot_owner_id = nextOwnerId;
        console.log(`👤 Round-robin: Assigned owner ${nextOwnerId} to company`);
      }
    }
  }
  
  // Remove generatedAt property if present (HubSpot doesn't allow camelCase)
  delete resolvedData.generatedAt;
  delete resolvedData.generated_at; // Also remove snake_case version from record data

  // Pre-persistence validation (if enabled)
  let validatedData = resolvedData;
  // Skip the strict validation that expects a specific schema structure
  // The LLM generates plain objects, not the complex companies array structure
  validatedData = trimStringsDeep(validatedData);
  
  // Remove internal fields
  delete validatedData.generatedAt;
  delete validatedData.generated_at;
  delete (validatedData as any).metadata;

  // Legacy validation and coercion
  const { validData: legacyValidatedData, errors } = validateAndCoerceRecordData(validatedData, 'companies');
  if (errors.length > 0) {
    console.warn(`⚠️ Data validation warnings for company:`, errors);
  }

  console.log(`📝 Creating company with data:`, JSON.stringify(legacyValidatedData, null, 2));

  // Validate and ensure properties exist
  await ensureHubSpotProperties('companies', Object.keys(legacyValidatedData), token, legacyValidatedData);
  
  // Convert property names to HubSpot-compatible format
  const hubspotData = convertPropertiesToHubSpotFormat(legacyValidatedData);
  
  // Create company via HubSpot API
  const response = await makeHubSpotRequest('POST', '/crm/v3/objects/companies', {
    properties: hubspotData
  }, token);
  
  return {
    success: true,
    recordId: response.id,
    action: 'create_company',
    data: response.properties,
    hubspotResponse: response,
    timestamp: new Date().toISOString()
  };
}

/**
 * Execute deal creation with deduplication and associations
 */
async function executeCreateDeal(data: any, token: string, step: any): Promise<any> {
  // Get user ID from job
  const job = await getJobById(step.jobId);
  if (!job) {
    return {
      success: false,
      error: 'Job not found for deal creation',
      action: 'create_deal',
      timestamp: new Date().toISOString()
    };
  }

  // Get user ID for pipeline validation
  const simulation = await storage.getSimulationById(job.simulationId);
  if (!simulation) {
    return {
      success: false,
      error: 'Simulation not found for pipeline validation',
      action: 'create_deal',
      timestamp: new Date().toISOString()
    };
  }

  // Validate pipeline and stage
  const validation = await validateDealStage(simulation.userId, data, token);
  if (!validation.isValid) {
    console.error(`Deal stage validation failed: ${validation.error}`);
    return {
      success: false,
      error: `Pipeline/Stage validation failed: ${validation.error}`,
      action: 'create_deal',
      timestamp: new Date().toISOString(),
      nonRetryable: true // Mark as non-retryable failure
    };
  }

  // Use validated data with resolved pipeline and stage IDs
  const validatedData = validation.resolvedData;
  
  // Remove generatedAt property if present (HubSpot doesn't allow camelCase)
  delete validatedData.generatedAt;
  delete validatedData.generated_at; // Also remove snake_case version from record data
  
  console.log(`✅ Deal stage validation passed. Pipeline: ${validatedData.pipeline}, Stage: ${validatedData.dealstage}`);

  // Resolve owner email to HubSpot owner ID if provided
  const resolvedData = await resolveOwnerEmail(simulation.userId, validatedData, token);
  
  // Pre-persistence validation (if enabled)
  let finalData = resolvedData;
  if (process.env.STRICT_VALIDATION_BEFORE_PERSISTENCE !== 'false') {
    finalData = trimStringsDeep(finalData);
    finalData = validateDataOrThrow(finalData, 'create_deal');
    
    // Remove internal fields
    delete finalData.generatedAt;
    delete finalData.generated_at;
    delete (finalData as any).metadata;
  }

  // Check for existing deal if search fallback is enabled and dealname exists
  if (ENABLE_SEARCH_FALLBACK && finalData.dealname) {
    const searchResult = await searchDeal(finalData.dealname, token);
    
    if (searchResult.found) {
      if (searchResult.ambiguous) {
        return {
          success: false,
          error: `Ambiguous deal match for name: ${finalData.dealname}`,
          action: 'create_deal',
          timestamp: new Date().toISOString()
        };
      } else if (searchResult.recordId) {
        console.log(`🔍 Deduplication: Using existing deal ${searchResult.recordId} for ${finalData.dealname}`);
        
        // Still handle associations for existing deal
        if (step.associationsTpl && Object.keys(step.associationsTpl).length > 0) {
          await createAssociations(searchResult.recordId, 'deals', step.associationsTpl, token);
        }
        
        return {
          success: true,
          recordId: searchResult.recordId,
          action: 'create_deal',
          data: finalData,
          deduplicated: true,
          timestamp: new Date().toISOString()
        };
      }
    }
  }
  
  // Legacy validation and coercion
  const { validData: coercedData, errors } = validateAndCoerceRecordData(finalData, 'deals');
  if (errors.length > 0) {
    console.warn(`⚠️ Data validation warnings for deal:`, errors);
  }

  // Validate and ensure properties exist
  await ensureHubSpotProperties('deals', Object.keys(coercedData), token, coercedData);
  
  // Convert property names to HubSpot-compatible format
  const hubspotData = convertPropertiesToHubSpotFormat(coercedData);
  
  // Create deal via HubSpot API
  const response = await makeHubSpotRequest('POST', '/crm/v3/objects/deals', {
    properties: hubspotData
  }, token);
  
  // Store the deal ID in job context for future template resolution
  await storeRecordIdInContext(step.jobId, step.recordIdTpl, response.id);
  
  // Handle associations if specified
  if (step.associationsTpl && Object.keys(step.associationsTpl).length > 0) {
    await createAssociations(response.id, 'deals', step.associationsTpl, token);
  }
  
  return {
    success: true,
    recordId: response.id,
    action: 'create_deal',
    data: response.properties,
    hubspotResponse: response,
    timestamp: new Date().toISOString()
  };
}

/**
 * Execute note creation with associations
 */
async function executeCreateNote(data: any, token: string, step: any): Promise<any> {
  // Remove generatedAt property if present (HubSpot doesn't allow camelCase)
  delete data.generatedAt;
  delete data.generated_at; // Also remove snake_case version from record data
  
  // Add ISO timestamp for HubSpot
  data.hs_timestamp = new Date().toISOString();
  
  // Validate and ensure properties exist
  await ensureHubSpotProperties('notes', Object.keys(data), token, data);
  
  // Convert property names to HubSpot-compatible format
  const hubspotData = convertPropertiesToHubSpotFormat(data);
  
  // Create note via HubSpot API
  const response = await makeHubSpotRequest('POST', '/crm/v3/objects/notes', {
    properties: hubspotData
  }, token);
  
  // Store the note ID in job context for future template resolution
  await storeRecordIdInContext(step.jobId, step.recordIdTpl, response.id);
  
  // Handle associations if specified
  if (step.associationsTpl && Object.keys(step.associationsTpl).length > 0) {
    await createAssociations(response.id, 'notes', step.associationsTpl, token);
  }
  
  return {
    success: true,
    recordId: response.id,
    action: 'create_note',
    data: response.properties,
    hubspotResponse: response,
    timestamp: new Date().toISOString()
  };
}

/**
 * Execute ticket creation with associations
 */
async function executeCreateTicket(data: any, token: string, step: any): Promise<any> {
  // Remove generatedAt property if present (HubSpot doesn't allow camelCase)
  delete data.generatedAt;
  delete data.generated_at; // Also remove snake_case version from record data

  // Pre-persistence validation (if enabled)
  let validatedData = data;
  if (process.env.STRICT_VALIDATION_BEFORE_PERSISTENCE !== 'false') {
    validatedData = trimStringsDeep(validatedData);
    validatedData = validateDataOrThrow(validatedData, 'create_ticket');
    
    // Remove internal fields
    delete validatedData.generatedAt;
    delete validatedData.generated_at;
    delete (validatedData as any).metadata;
  }

  // Validate and ensure properties exist
  await ensureHubSpotProperties('tickets', Object.keys(validatedData), token);
  
  // Convert property names to HubSpot-compatible format
  const hubspotData = convertPropertiesToHubSpotFormat(validatedData);
  
  // Create ticket via HubSpot API
  const response = await makeHubSpotRequest('POST', '/crm/v3/objects/tickets', {
    properties: hubspotData
  }, token);
  
  // Store the ticket ID in job context for future template resolution
  await storeRecordIdInContext(step.jobId, step.recordIdTpl, response.id);
  
  // Handle associations if specified
  if (step.associationsTpl && Object.keys(step.associationsTpl).length > 0) {
    await createAssociations(response.id, 'tickets', step.associationsTpl, token);
  }
  
  return {
    success: true,
    recordId: response.id,
    action: 'create_ticket',
    data: response.properties,
    hubspotResponse: response,
    timestamp: new Date().toISOString()
  };
}

/**
 * Execute deal update
 */
async function executeUpdateDeal(data: any, token: string, step: any): Promise<any> {
  const dealId = extractRecordId(step.recordIdTpl);
  
  // Get user ID from job for validation if pipeline/stage data is being updated
  if (data.pipeline || data.dealstage) {
    const job = await getJobById(step.jobId);
    if (!job) {
      return {
        success: false,
        error: 'Job not found for deal update validation',
        action: 'update_deal',
        timestamp: new Date().toISOString()
      };
    }

    // Get user ID for pipeline validation
    const simulation = await storage.getSimulationById(job.simulationId);
    if (!simulation) {
      return {
        success: false,
        error: 'Simulation not found for pipeline validation',
        action: 'update_deal',
        timestamp: new Date().toISOString()
      };
    }

    // Validate pipeline and stage if they're being updated
    const validation = await validateDealStage(simulation.userId, data, token);
    if (!validation.isValid) {
      console.error(`Deal update stage validation failed: ${validation.error}`);
      return {
        success: false,
        error: `Pipeline/Stage validation failed: ${validation.error}`,
        action: 'update_deal',
        timestamp: new Date().toISOString(),
        nonRetryable: true // Mark as non-retryable failure
      };
    }

    // Use validated data with resolved pipeline and stage IDs
    data = validation.resolvedData;
    console.log(`✅ Deal update stage validation passed. Pipeline: ${data.pipeline}, Stage: ${data.dealstage}`);
  }
  
  // Validate and ensure properties exist
  await ensureHubSpotProperties('deals', Object.keys(data), token, data);
  
  // Convert property names to HubSpot-compatible format
  const hubspotData = convertPropertiesToHubSpotFormat(data);
  
  // Update deal via HubSpot API
  const response = await makeHubSpotRequest('PATCH', `/crm/v3/objects/deals/${dealId}`, {
    properties: hubspotData
  }, token);
  
  return {
    success: true,
    recordId: dealId,
    action: 'update_deal',
    data: response.properties,
    hubspotResponse: response,
    timestamp: new Date().toISOString()
  };
}

/**
 * Execute ticket update
 */
async function executeUpdateTicket(data: any, token: string, step: any): Promise<any> {
  const ticketId = extractRecordId(step.recordIdTpl);
  
  // Validate and ensure properties exist
  await ensureHubSpotProperties('tickets', Object.keys(data), token, data);
  
  // Convert property names to HubSpot-compatible format
  const hubspotData = convertPropertiesToHubSpotFormat(data);
  
  // Update ticket via HubSpot API
  const response = await makeHubSpotRequest('PATCH', `/crm/v3/objects/tickets/${ticketId}`, {
    properties: hubspotData
  }, token);
  
  return {
    success: true,
    recordId: ticketId,
    action: 'update_ticket',
    data: response.properties,
    hubspotResponse: response,
    timestamp: new Date().toISOString()
  };
}

/**
 * Execute ticket closure
 */
async function executeCloseTicket(data: any, token: string, step: any): Promise<any> {
  const ticketId = extractRecordId(step.recordIdTpl);
  
  // Validate and ensure properties exist
  await ensureHubSpotProperties('tickets', Object.keys(data), token, data);
  
  // Convert property names to HubSpot-compatible format
  const hubspotData = convertPropertiesToHubSpotFormat(data);
  
  // Close ticket via HubSpot API
  const response = await makeHubSpotRequest('PATCH', `/crm/v3/objects/tickets/${ticketId}`, {
    properties: hubspotData
  }, token);
  
  return {
    success: true,
    recordId: ticketId,
    action: 'close_ticket',
    data: response.properties,
    hubspotResponse: response,
    timestamp: new Date().toISOString()
  };
}

/**
 * HubSpot standard property name mappings to avoid creating unnecessary custom properties
 */
const HUBSPOT_STANDARD_PROPERTIES: Record<string, string> = {
  // Contact properties
  'firstname': 'firstname',
  'lastname': 'lastname', 
  'email': 'email',
  'phone': 'phone',
  'jobtitle': 'jobtitle',
  'company': 'company',
  'website': 'website',
  'lifecyclestage': 'lifecyclestage',
  'address': 'address',
  'city': 'city',
  'state': 'state',
  'zip': 'zip',
  'country': 'country',
  
  // Company properties
  'name': 'name',
  'domain': 'domain',
  'industry': 'industry',
  'numberofemployees': 'numberofemployees',
  'annualrevenue': 'annualrevenue',
  'type': 'type',
  
  // Deal properties
  'dealname': 'dealname',
  'amount': 'amount',
  'dealstage': 'dealstage',
  'pipeline': 'pipeline',
  'closedate': 'closedate',
  'hubspot_owner_id': 'hubspot_owner_id',
  
  // Common camelCase to standard mappings
  'firstName': 'firstname',
  'lastName': 'lastname',
  'jobTitle': 'jobtitle',
  'lifecycleStage': 'lifecyclestage',
  'dealName': 'dealname',
  'dealStage': 'dealstage',
  'closeDate': 'closedate',
  'numberOfEmployees': 'numberofemployees',
  'annualRevenue': 'annualrevenue'
};

/**
 * Convert property names to HubSpot-compatible format
 * 1. Map to standard HubSpot properties when available
 * 2. Convert custom properties to lowercase with underscores
 * 3. Ensure compliance with HubSpot naming rules
 */
function convertPropertiesToHubSpotFormat(data: any): any {
  const converted: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    let hubspotKey: string;
    
    // Check if it's a standard HubSpot property
    if (HUBSPOT_STANDARD_PROPERTIES[key] || HUBSPOT_STANDARD_PROPERTIES[key.toLowerCase()]) {
      hubspotKey = HUBSPOT_STANDARD_PROPERTIES[key] || HUBSPOT_STANDARD_PROPERTIES[key.toLowerCase()];
    } else {
      // Convert custom property to HubSpot format
      hubspotKey = key
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_') // Replace invalid chars with underscores
        .replace(/^[^a-z]/, 'prop_') // Ensure starts with letter
        .replace(/_+/g, '_') // Remove duplicate underscores
        .substring(0, 100); // Limit to 100 chars
    }
    
    converted[hubspotKey] = value;
  }
  
  return converted;
}

/**
 * Ensure HubSpot properties exist for the given object type
 * Handles all property types and automatically creates missing select options
 */
async function ensureHubSpotProperties(objectType: string, propertyNames: string[], token: string, recordData?: any): Promise<void> {
  try {
    // Get existing properties
    const existingProperties = await makeHubSpotRequest('GET', `/crm/v3/properties/${objectType}`, null, token);
    const existingNames = new Set(existingProperties.results.map((prop: any) => prop.name));
    const existingPropertiesMap = new Map(existingProperties.results.map((prop: any) => [prop.name, prop]));
    
    console.log(`📋 Found ${existingNames.size} existing properties for ${objectType}`);
    
    // Convert property names to HubSpot format
    const hubspotPropertyNames = propertyNames.map(name => {
      if (HUBSPOT_STANDARD_PROPERTIES[name] || HUBSPOT_STANDARD_PROPERTIES[name.toLowerCase()]) {
        return HUBSPOT_STANDARD_PROPERTIES[name] || HUBSPOT_STANDARD_PROPERTIES[name.toLowerCase()];
      } else {
        return name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^[^a-z]/, 'prop_').replace(/_+/g, '_').substring(0, 100);
      }
    });
    
    // Only try to create properties that don't exist AND aren't standard HubSpot properties
    const missingProperties = hubspotPropertyNames.filter(name => {
      const exists = existingNames.has(name);
      const isStandard = Object.values(HUBSPOT_STANDARD_PROPERTIES).includes(name);
      
      if (exists || isStandard) {
        console.log(`⏭️ Skipping property ${name}: ${exists ? 'exists' : ''} ${isStandard ? 'standard' : ''}`);
        return false;
      }
      return true;
    });
    
    console.log(`🔧 Need to create ${missingProperties.length} custom properties for ${objectType}`);
    
    // Create only truly missing custom properties
    for (const hubspotPropertyName of missingProperties) {
      const originalPropertyName = propertyNames[hubspotPropertyNames.indexOf(hubspotPropertyName)];
      
      const propertyConfig = await createComprehensivePropertyConfig(hubspotPropertyName, objectType, recordData);
      try {
        const createdProperty = await makeHubSpotRequest('POST', `/crm/v3/properties/${objectType}`, propertyConfig, token);
        console.log(`✅ Created missing property: ${originalPropertyName} → ${hubspotPropertyName} (${propertyConfig.type}/${propertyConfig.fieldType}) for ${objectType}`);
        existingPropertiesMap.set(hubspotPropertyName, createdProperty);
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log(`ℹ️ Property ${hubspotPropertyName} already exists, skipping creation`);
        } else {
          console.warn(`❌ Failed to create property ${originalPropertyName} → ${hubspotPropertyName}:`, error.message);
        }
      }
    }

    // Handle select field options for existing properties
    if (recordData) {
      await ensureSelectOptions(objectType, existingPropertiesMap as Map<string, any>, recordData, token);
    }
  } catch (error: any) {
    console.warn(`Error ensuring properties for ${objectType}:`, error.message);
    // Continue execution even if property validation fails
  }
}

/**
 * Create comprehensive property configuration for HubSpot with all types
 */
async function createComprehensivePropertyConfig(propertyName: string, objectType: string, recordData?: any): Promise<any> {
  const propertyType = determinePropertyType(propertyName, recordData);
  const fieldType = determineFieldType(propertyName, propertyType);
  
  const config: any = {
    name: propertyName.toLowerCase(),
    label: formatPropertyLabel(propertyName),
    type: propertyType.type,
    fieldType: fieldType,
    groupName: getPropertyGroup(objectType),
    description: `Auto-created ${propertyType.description} property for ${objectType}`
  };

  // Add type-specific configurations
  if (propertyType.type === 'enumeration') {
    config.options = propertyType.options || [];
  }

  if (propertyType.type === 'number') {
    config.hasUniqueValue = false;
    if (propertyType.constraints) {
      config.numberDisplayHint = propertyType.constraints.displayHint || 'unformatted';
    }
  }

  if (propertyType.type === 'datetime') {
    config.hasUniqueValue = false;
  }

  if (propertyType.type === 'bool') {
    config.hasUniqueValue = false;
  }

  return config;
}

/**
 * Legacy property config for backward compatibility
 */
function createPropertyConfig(propertyName: string, objectType: string): any {
  return {
    name: propertyName,
    label: propertyName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
    type: getPropertyType(propertyName),
    fieldType: getFieldType(propertyName),
    groupName: 'contactinformation'
  };
}

/**
 * Determine comprehensive property type based on property name and data
 */
function determinePropertyType(propertyName: string, recordData?: any): any {
  const name = propertyName.toLowerCase();
  
  // Get actual value from record data if available
  const value = recordData?.[propertyName];
  
  // Boolean fields
  if (name.includes('is_') || name.includes('has_') || name.includes('can_') || 
      name.includes('active') || name.includes('enabled') || name.includes('verified') ||
      (typeof value === 'boolean')) {
    return {
      type: 'bool',
      description: 'boolean'
    };
  }
  
  // Date/DateTime fields
  if (name.includes('date') || name.includes('timestamp') || name.includes('created') || 
      name.includes('updated') || name.includes('modified') || name.includes('_at') ||
      (value && typeof value === 'string' && isValidDate(value))) {
    return {
      type: 'datetime',
      description: 'date/time'
    };
  }
  
  // Number fields
  if (name.includes('amount') || name.includes('price') || name.includes('cost') || 
      name.includes('revenue') || name.includes('count') || name.includes('number') || 
      name.includes('quantity') || name.includes('score') || name.includes('rating') ||
      name.includes('size') || name.includes('weight') || name.includes('age') ||
      (typeof value === 'number')) {
    return {
      type: 'number',
      description: 'numeric',
      constraints: {
        displayHint: name.includes('amount') || name.includes('price') || name.includes('cost') || name.includes('revenue') 
          ? 'currency' : 'unformatted'
      }
    };
  }
  
  // Single-select enumeration fields (common business fields)
  if (name.includes('status') || name.includes('stage') || name.includes('type') || 
      name.includes('category') || name.includes('priority') || name.includes('level') ||
      name.includes('tier') || name.includes('segment') || name.includes('industry') ||
      name.includes('department') || name.includes('role') || name.includes('position') ||
      name.includes('size') || name.includes('source') || name.includes('channel') ||
      name.includes('method') || name.includes('grade') || name.includes('qualification')) {
    
    // Extract initial options from value if available
    const options = value ? [{ label: value, value: value }] : [];
    
    return {
      type: 'enumeration',
      description: 'single-select',
      options: options
    };
  }
  
  // Multi-select enumeration fields
  if (name.includes('tags') || name.includes('skills') || name.includes('interests') ||
      name.includes('categories') || name.includes('features') || name.includes('services') ||
      (Array.isArray(value))) {
    
    // Extract options from array value if available
    const options = Array.isArray(value) ? 
      value.map(v => ({ label: v, value: v })) : [];
    
    return {
      type: 'enumeration',
      description: 'multi-select',
      options: options
    };
  }
  
  // Default to string
  return {
    type: 'string',
    description: 'text'
  };
}

/**
 * Determine field type based on property name and type info
 */
function determineFieldType(propertyName: string, propertyType: any): string {
  const name = propertyName.toLowerCase();
  
  // Map property types to field types
  switch (propertyType.type) {
    case 'bool':
      return 'booleancheckbox';
    case 'datetime':
      return 'date';
    case 'number':
      return 'number';
    case 'enumeration':
      return propertyType.description === 'multi-select' ? 'checkbox' : 'select';
  }
  
  // String field types based on name patterns
  if (name.includes('email')) return 'email';
  if (name.includes('phone')) return 'phonenumber';
  if (name.includes('url') || name.includes('website') || name.includes('link')) return 'text';
  if (name.includes('description') || name.includes('notes') || name.includes('comment')) return 'textarea';
  
  return 'text';
}

/**
 * Format property label for display
 */
function formatPropertyLabel(propertyName: string): string {
  return propertyName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Get appropriate property group for object type
 */
function getPropertyGroup(objectType: string): string {
  const groupMap: Record<string, string> = {
    'contacts': 'contactinformation',
    'companies': 'companyinformation', 
    'deals': 'dealinformation',
    'tickets': 'ticketinformation',
    'notes': 'noteinformation'
  };
  
  return groupMap[objectType] || 'contactinformation';
}

/**
 * Check if string is a valid date
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.length > 8;
}

/**
 * Legacy functions for backward compatibility
 */
function getPropertyType(propertyName: string): string {
  if (propertyName.includes('email')) return 'string';
  if (propertyName.includes('phone')) return 'string';
  if (propertyName.includes('amount') || propertyName.includes('number')) return 'number';
  if (propertyName.includes('date') || propertyName.includes('timestamp')) return 'datetime';
  return 'string';
}

function getFieldType(propertyName: string): string {
  if (propertyName.includes('email')) return 'email';
  if (propertyName.includes('phone')) return 'phonenumber';
  if (propertyName.includes('amount') || propertyName.includes('number')) return 'number';
  if (propertyName.includes('date') || propertyName.includes('timestamp')) return 'date';
  return 'text';
}

/**
 * Ensure select field options exist for enumeration properties
 */
async function ensureSelectOptions(objectType: string, propertiesMap: Map<string, any>, recordData: any, token: string): Promise<void> {
  for (const [propertyName, property] of Array.from(propertiesMap.entries())) {
    if (property.type === 'enumeration' && recordData[propertyName]) {
      const currentValue = recordData[propertyName];
      const values = Array.isArray(currentValue) ? currentValue : [currentValue];
      
      // Get existing options
      const existingOptions = new Set(property.options?.map((opt: any) => opt.value) || []);
      
      // Check for missing options
      const missingOptions = values.filter((value: string) => !existingOptions.has(value));
      
      if (missingOptions.length > 0) {
        try {
          // Add missing options to the property
          const newOptions = missingOptions.map((value: string) => ({
            label: value,
            value: value,
            description: `Auto-created option for ${propertyName}`,
            displayOrder: (property.options?.length || 0) + missingOptions.indexOf(value)
          }));
          
          await makeHubSpotRequest('PATCH', `/crm/v3/properties/${objectType}/${propertyName}`, {
            options: [...(property.options || []), ...newOptions]
          }, token);
          
          console.log(`✅ Added options [${missingOptions.join(', ')}] to property ${propertyName} for ${objectType}`);
        } catch (error: any) {
          console.warn(`❌ Failed to add options to property ${propertyName}:`, error.message);
          // Continue with other properties
        }
      }
    }
  }
}

/**
 * Validate and coerce record data according to property constraints
 */
function validateAndCoerceRecordData(recordData: any, objectType: string): { validData: any; errors: string[] } {
  const validData = { ...recordData };
  const errors: string[] = [];

  for (const [key, value] of Object.entries(recordData)) {
    if (value === null || value === undefined) continue;
    
    const propertyType = determinePropertyType(key, recordData);
    
    try {
      switch (propertyType.type) {
        case 'number':
          if (typeof value === 'string' && value.trim() !== '') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              validData[key] = numValue;
            } else {
              errors.push(`Cannot convert "${value}" to number for property ${key}`);
              delete validData[key];
            }
          } else if (typeof value !== 'number') {
            errors.push(`Invalid number value for property ${key}: ${value}`);
            delete validData[key];
          }
          break;
          
        case 'bool':
          if (typeof value === 'string') {
            const lowerValue = value.toLowerCase();
            if (['true', '1', 'yes', 'on', 'enabled', 'active'].includes(lowerValue)) {
              validData[key] = true;
            } else if (['false', '0', 'no', 'off', 'disabled', 'inactive'].includes(lowerValue)) {
              validData[key] = false;
            } else {
              errors.push(`Cannot convert "${value}" to boolean for property ${key}`);
              delete validData[key];
            }
          } else if (typeof value !== 'boolean') {
            errors.push(`Invalid boolean value for property ${key}: ${value}`);
            delete validData[key];
          }
          break;
          
        case 'datetime':
          if (typeof value === 'string') {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
              errors.push(`Invalid date format for property ${key}: ${value}`);
              delete validData[key];
            } else {
              validData[key] = date.toISOString();
            }
          }
          break;
          
        case 'string':
          if (typeof value !== 'string') {
            validData[key] = String(value);
          }
          // Validate string length constraints
          if (typeof validData[key] === 'string' && validData[key].length > 65536) {
            errors.push(`String too long for property ${key} (max 65536 characters)`);
            validData[key] = validData[key].substring(0, 65536);
          }
          break;
          
        case 'enumeration':
          // Enumeration values are handled by ensureSelectOptions
          if (Array.isArray(value)) {
            validData[key] = value.map(v => String(v));
          } else {
            validData[key] = String(value);
          }
          break;
      }
    } catch (error: any) {
      errors.push(`Error processing property ${key}: ${error.message}`);
      delete validData[key];
    }
  }

  return { validData, errors };
}

/**
 * Create associations between HubSpot records with comprehensive validation
 */
async function createAssociations(fromObjectId: string, fromObjectType: string, associations: any, token: string): Promise<{ 
  successful: number; 
  failed: number; 
  errors: Array<{ association: string; error: string }> 
}> {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as Array<{ association: string; error: string }>
  };

  for (const [toObjectType, toObjectIdTemplate] of Object.entries(associations)) {
    try {
      // Validate association before attempting to create
      const validation = validateAssociation(fromObjectType, toObjectType as string);
      
      if (!validation.isValid) {
        const errorMsg = validation.error || 'Unknown validation error';
        console.error(`❌ Association validation failed: ${fromObjectType} → ${toObjectType}: ${errorMsg}`);
        results.failed++;
        results.errors.push({
          association: `${fromObjectType} → ${toObjectType}`,
          error: errorMsg
        });
        continue;
      }

      const toObjectId = extractRecordId(toObjectIdTemplate as string);
      
      if (!toObjectId || toObjectId.trim() === '') {
        const errorMsg = `Invalid target object ID: ${toObjectIdTemplate}`;
        console.error(`❌ ${errorMsg}`);
        results.failed++;
        results.errors.push({
          association: `${fromObjectType} → ${toObjectType}`,
          error: errorMsg
        });
        continue;
      }

      // Create the association using validated type ID
      await makeHubSpotRequest('PUT', `/crm/v4/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}/${toObjectId}`, {
        associationCategory: 'HUBSPOT_DEFINED',
        associationTypeId: validation.associationTypeId
      }, token);
      
      console.log(`✅ Created association: ${fromObjectType}:${fromObjectId} → ${toObjectType}:${toObjectId} (type: ${validation.associationTypeId})`);
      results.successful++;
      
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      console.error(`❌ Failed to create association ${fromObjectType} → ${toObjectType}:`, errorMsg);
      results.failed++;
      results.errors.push({
        association: `${fromObjectType} → ${toObjectType}`,
        error: errorMsg
      });
    }
  }

  // Log summary
  console.log(`Association creation summary: ${results.successful} successful, ${results.failed} failed`);
  if (results.errors.length > 0) {
    console.log('Association errors:', results.errors);
  }

  return results;
}

/**
 * Comprehensive HubSpot Association Type Mapping
 * 
 * This centralized mapping covers all supported object relationships in HubSpot.
 * Association type IDs are HubSpot-defined constants for standard relationships.
 */
const HUBSPOT_ASSOCIATION_MAP: Record<string, Record<string, number>> = {
  // Contact associations
  'contacts': {
    'companies': 1,      // Contact to Company (Primary)
    'deals': 4,          // Contact to Deal
    'tickets': 15,       // Contact to Ticket
    'calls': 193,        // Contact to Call
    'emails': 197,       // Contact to Email
    'meetings': 199,     // Contact to Meeting
    'notes': 201,        // Contact to Note
    'tasks': 203,        // Contact to Task
    'quotes': 69,        // Contact to Quote
    'line_items': 19,    // Contact to Line Item
  },
  
  // Company associations  
  'companies': {
    'contacts': 2,       // Company to Contact (Primary)
    'deals': 6,          // Company to Deal
    'tickets': 26,       // Company to Ticket  
    'calls': 181,        // Company to Call
    'emails': 185,       // Company to Email
    'meetings': 187,     // Company to Meeting
    'notes': 189,        // Company to Note
    'tasks': 191,        // Company to Task
    'quotes': 70,        // Company to Quote
    'line_items': 20,    // Company to Line Item
  },
  
  // Deal associations
  'deals': {
    'contacts': 3,       // Deal to Contact
    'companies': 5,      // Deal to Company
    'tickets': 27,       // Deal to Ticket
    'calls': 205,        // Deal to Call
    'emails': 209,       // Deal to Email
    'meetings': 211,     // Deal to Meeting
    'notes': 213,        // Deal to Note
    'tasks': 215,        // Deal to Task
    'quotes': 67,        // Deal to Quote
    'line_items': 21,    // Deal to Line Item
    'products': 22,      // Deal to Product
  },
  
  // Ticket associations
  'tickets': {
    'contacts': 16,      // Ticket to Contact
    'companies': 25,     // Ticket to Company
    'deals': 28,         // Ticket to Deal
    'calls': 217,        // Ticket to Call
    'emails': 221,       // Ticket to Email
    'meetings': 223,     // Ticket to Meeting
    'notes': 225,        // Ticket to Note
    'tasks': 227,        // Ticket to Task
  },
  
  // Note associations
  'notes': {
    'contacts': 202,     // Note to Contact
    'companies': 190,    // Note to Company
    'deals': 214,        // Note to Deal
    'tickets': 226,      // Note to Ticket
    'calls': 229,        // Note to Call
    'emails': 233,       // Note to Email
    'meetings': 235,     // Note to Meeting
    'tasks': 237,        // Note to Task
  },
  
  // Call associations
  'calls': {
    'contacts': 194,     // Call to Contact
    'companies': 182,    // Call to Company
    'deals': 206,        // Call to Deal
    'tickets': 218,      // Call to Ticket
    'notes': 230,        // Call to Note
    'emails': 241,       // Call to Email
    'meetings': 243,     // Call to Meeting
    'tasks': 245,        // Call to Task
  },
  
  // Email associations
  'emails': {
    'contacts': 198,     // Email to Contact
    'companies': 186,    // Email to Company
    'deals': 210,        // Email to Deal
    'tickets': 222,      // Email to Ticket
    'notes': 234,        // Email to Note
    'calls': 242,        // Email to Call
    'meetings': 247,     // Email to Meeting
    'tasks': 249,        // Email to Task
  },
  
  // Meeting associations
  'meetings': {
    'contacts': 200,     // Meeting to Contact
    'companies': 188,    // Meeting to Company
    'deals': 212,        // Meeting to Deal
    'tickets': 224,      // Meeting to Ticket
    'notes': 236,        // Meeting to Note
    'calls': 244,        // Meeting to Call
    'emails': 248,       // Meeting to Email
    'tasks': 251,        // Meeting to Task
  },
  
  // Task associations
  'tasks': {
    'contacts': 204,     // Task to Contact
    'companies': 192,    // Task to Company
    'deals': 216,        // Task to Deal
    'tickets': 228,      // Task to Ticket
    'notes': 238,        // Task to Note
    'calls': 246,        // Task to Call
    'emails': 250,       // Task to Email
    'meetings': 252,     // Task to Meeting
  },
  
  // Product associations
  'products': {
    'deals': 23,         // Product to Deal
    'line_items': 24,    // Product to Line Item
    'quotes': 71,        // Product to Quote
  },
  
  // Line Item associations
  'line_items': {
    'contacts': 17,      // Line Item to Contact
    'companies': 18,     // Line Item to Company
    'deals': 29,         // Line Item to Deal
    'products': 30,      // Line Item to Product
    'quotes': 72,        // Line Item to Quote
  },
  
  // Quote associations
  'quotes': {
    'contacts': 73,      // Quote to Contact
    'companies': 74,     // Quote to Company
    'deals': 68,         // Quote to Deal
    'products': 75,      // Quote to Product
    'line_items': 76,    // Quote to Line Item
  }
};

/**
 * Get association type ID for HubSpot associations with validation
 */
function getAssociationTypeId(fromType: string, toType: string): number {
  const normalizedFromType = fromType.toLowerCase();
  const normalizedToType = toType.toLowerCase();
  
  const associationTypeId = HUBSPOT_ASSOCIATION_MAP[normalizedFromType]?.[normalizedToType];
  
  if (!associationTypeId) {
    throw new Error(`Unsupported association: ${fromType} → ${toType}. Check supported associations with validateAssociation().`);
  }
  
  return associationTypeId;
}

/**
 * Validate if an association combination is supported
 */
function validateAssociation(fromType: string, toType: string): { 
  isValid: boolean; 
  associationTypeId?: number; 
  error?: string; 
  supportedAssociations?: string[] 
} {
  const normalizedFromType = fromType.toLowerCase();
  const normalizedToType = toType.toLowerCase();
  
  // Check if source object type is supported
  if (!HUBSPOT_ASSOCIATION_MAP[normalizedFromType]) {
    const supportedTypes = Object.keys(HUBSPOT_ASSOCIATION_MAP);
    return {
      isValid: false,
      error: `Unsupported source object type '${fromType}'. Supported types: ${supportedTypes.join(', ')}`,
      supportedAssociations: supportedTypes
    };
  }
  
  // Check if target object type is supported for this source
  const associationTypeId = HUBSPOT_ASSOCIATION_MAP[normalizedFromType][normalizedToType];
  if (!associationTypeId) {
    const supportedTargets = Object.keys(HUBSPOT_ASSOCIATION_MAP[normalizedFromType]);
    return {
      isValid: false,
      error: `Unsupported association '${fromType} → ${toType}'. Supported associations from ${fromType}: ${supportedTargets.join(', ')}`,
      supportedAssociations: supportedTargets.map(target => `${fromType} → ${target}`)
    };
  }
  
  return {
    isValid: true,
    associationTypeId
  };
}

/**
 * Get all supported associations for a given object type
 */
function getSupportedAssociations(objectType?: string): Record<string, string[]> | string[] {
  if (!objectType) {
    // Return all supported associations
    const allAssociations: Record<string, string[]> = {};
    Object.keys(HUBSPOT_ASSOCIATION_MAP).forEach(fromType => {
      allAssociations[fromType] = Object.keys(HUBSPOT_ASSOCIATION_MAP[fromType]);
    });
    return allAssociations;
  }
  
  const normalizedType = objectType.toLowerCase();
  const supportedTargets = HUBSPOT_ASSOCIATION_MAP[normalizedType];
  
  if (!supportedTargets) {
    return [];
  }
  
  return Object.keys(supportedTargets);
}

/**
 * Extract record ID from template string
 */
function extractRecordId(template: string): string {
  // For now, return the template as-is
  // In a real implementation, this would resolve template variables
  return template;
}

/**
 * Make HTTP request to HubSpot API with rate limiting
 */
async function makeHubSpotRequest(method: string, endpoint: string, data: any, token: string): Promise<any> {
  return rateLimiter.executeWithRateLimit('hubspot', async () => {
    const url = `https://api.hubapi.com${endpoint}`;
    
    // Enhanced logging for HubSpot requests
    console.log(`📤 HUBSPOT API ${method} ${endpoint}`);
    if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      console.log(`📦 Request Body: ${JSON.stringify(data, null, 2)}`);
    }
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ HUBSPOT ERROR ${response.status}: ${errorData}`);
      
      // Create error with proper status and headers for rate limiter
      const error = new Error(`HubSpot API error (${response.status}): ${errorData}`);
      (error as any).status = response.status;
      (error as any).headers = Object.fromEntries(response.headers.entries());
      
      throw error;
    }
    
    const responseData = await response.json();
    console.log(`✅ HUBSPOT SUCCESS: ${JSON.stringify(responseData, null, 2)}`);
    return responseData;
  }, {
    onRetry: (attempt, error) => {
      console.log(`🔄 HubSpot API retry ${attempt + 1} for ${method} ${endpoint}: ${error.message}`);
    },
    onRateLimit: (delayMs) => {
      console.log(`🚦 HubSpot rate limit triggered. Backing off for ${delayMs}ms`);
    }
  });
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

/**
 * Fetch and cache HubSpot pipelines and stages for a user
 */
async function fetchAndCachePipelinesAndStages(userId: number, token: string): Promise<void> {
  try {
    console.log(`Fetching and caching pipelines and stages for user ${userId}`);
    
    // Fetch deal pipelines from HubSpot
    const pipelinesResponse = await makeHubSpotRequest('GET', '/crm/v3/pipelines/deals', null, token);
    
    if (!pipelinesResponse.results || pipelinesResponse.results.length === 0) {
      console.warn('No deal pipelines found in HubSpot');
      return;
    }

    // Prepare pipeline data for caching
    const pipelineData = pipelinesResponse.results.map((pipeline: any) => ({
      userId,
      hubspotId: pipeline.id,
      label: pipeline.label,
      displayOrder: pipeline.displayOrder,
      objectType: 'deals'
    }));

    // Cache pipelines in database
    const cachedPipelines = await storage.cacheHubspotPipelines(userId, pipelineData);
    console.log(`Cached ${cachedPipelines.length} pipelines`);

    // Fetch and cache stages for each pipeline
    for (const cachedPipeline of cachedPipelines) {
      const originalPipeline = pipelinesResponse.results.find((p: any) => p.id === cachedPipeline.hubspotId);
      
      if (originalPipeline && originalPipeline.stages && originalPipeline.stages.length > 0) {
        const stageData = originalPipeline.stages.map((stage: any) => ({
          pipelineId: cachedPipeline.id,
          hubspotId: stage.id,
          label: stage.label,
          displayOrder: stage.displayOrder,
          probability: stage.metadata?.probability || 0,
          isClosed: stage.metadata?.isClosed || false
        }));

        const cachedStages = await storage.cacheHubspotStages(stageData);
        console.log(`Cached ${cachedStages.length} stages for pipeline ${cachedPipeline.label}`);
      }
    }

    console.log('Pipeline and stage caching completed successfully');
    
  } catch (error: any) {
    console.error('Error fetching and caching pipelines/stages:', error.message);
    throw error;
  }
}

/**
 * Fetch and cache owners from HubSpot API for a user
 */
async function fetchAndCacheOwners(userId: number, token: string): Promise<void> {
  try {
    console.log(`Fetching and caching owners for user ${userId}`);
    
    // Fetch owners from HubSpot
    const ownersResponse = await makeHubSpotRequest('GET', '/crm/v3/owners', null, token);
    
    if (!ownersResponse.results || ownersResponse.results.length === 0) {
      console.warn('No owners found in HubSpot');
      return;
    }

    // Prepare owner data for caching
    const ownerData = ownersResponse.results.map((owner: any) => ({
      userId,
      hubspotId: owner.id,
      email: owner.email,
      firstName: owner.firstName || null,
      lastName: owner.lastName || null,
      isActive: owner.archived === false
    }));

    // Cache owners in database
    await storage.cacheHubspotOwners(ownerData);
    console.log(`Cached ${ownerData.length} owners`);
    
  } catch (error: any) {
    console.error('Error fetching and caching owners:', error.message);
    throw error;
  }
}

/**
 * Get owner ID by email with caching
 */
async function getOwnerIdByEmail(userId: number, email: string, token: string): Promise<string | null> {
  try {
    // Get cached owners first
    let cachedOwners = await storage.getHubspotOwners(userId);
    
    // If no cached owners, fetch and cache them
    if (cachedOwners.length === 0) {
      console.log('No cached owners found, fetching from HubSpot...');
      await fetchAndCacheOwners(userId, token);
      cachedOwners = await storage.getHubspotOwners(userId);
    }
    
    // Find owner by email (case-insensitive)
    const owner = cachedOwners.find(o => o.email.toLowerCase() === email.toLowerCase());
    return owner ? owner.hubspotId : null;
    
  } catch (error: any) {
    console.error('Error getting owner ID by email:', error.message);
    return null; // Return null for missing owner (graceful failure)
  }
}

/**
 * Resolve owner email to HubSpot owner ID in record data
 */
async function resolveOwnerEmail(userId: number, recordData: Record<string, any>, token: string): Promise<Record<string, any>> {
  const resolvedData = { ...recordData };
  
  // Check for owner field by email (support multiple field names)
  const ownerEmailField = recordData.owner_email || recordData.ownerEmail || recordData.owner;
  
  if (ownerEmailField && typeof ownerEmailField === 'string' && ownerEmailField.includes('@')) {
    const ownerId = await getOwnerIdByEmail(userId, ownerEmailField, token);
    
    if (ownerId) {
      // Set the HubSpot owner ID field
      resolvedData.hubspot_owner_id = ownerId;
      console.log(`✅ Resolved owner email ${ownerEmailField} to ID ${ownerId}`);
    } else {
      console.log(`⚠️ Owner email ${ownerEmailField} not found - leaving unassigned`);
    }
    
    // Remove the email fields from the final data
    delete resolvedData.owner_email;
    delete resolvedData.ownerEmail;
    delete resolvedData.owner;
  }
  
  return resolvedData;
}

// Export functions for testing and external use
export { 
  resolveOwnerEmail, 
  getOwnerIdByEmail, 
  fetchAndCacheOwners,
  fetchAndCachePipelinesAndStages,
  makeHubSpotRequest,
  determinePropertyType,
  determineFieldType,
  validateAndCoerceRecordData,
  validateAssociation,
  getSupportedAssociations,
  createAssociations,
  executeCreateContact,
  executeCreateCompany,
  executeCreateDeal,
  executeCreateTicket,
  executeCreateNote,
  executeUpdateDeal,
  executeUpdateTicket,
  executeCloseTicket
};

/**
 * Validate deal stage against cached pipeline/stage data
 */
export async function validateDealStage(userId: number, dealData: any, token: string): Promise<{ isValid: boolean; error?: string; resolvedData?: any }> {
  try {
    // Get cached pipelines for deals
    let pipelines = await storage.getHubspotPipelines(userId, 'deals');
    
    // If no cached pipelines, fetch and cache them first
    if (pipelines.length === 0) {
      console.log('No cached pipelines found, fetching from HubSpot...');
      await fetchAndCachePipelinesAndStages(userId, token);
      pipelines = await storage.getHubspotPipelines(userId, 'deals');
    }

    if (pipelines.length === 0) {
      return {
        isValid: false,
        error: 'No deal pipelines found in HubSpot account'
      };
    }

    const pipeline = dealData.pipeline;
    const dealstage = dealData.dealstage;

    if (!pipeline && !dealstage) {
      // No pipeline or stage specified, use default
      const defaultPipeline = pipelines[0]; // Use first pipeline as default
      const stages = await storage.getHubspotStages(defaultPipeline.id);
      
      if (stages.length === 0) {
        return {
          isValid: false,
          error: `No stages found for default pipeline '${defaultPipeline.label}'`
        };
      }

      return {
        isValid: true,
        resolvedData: {
          ...dealData,
          pipeline: defaultPipeline.hubspotId,
          dealstage: stages[0].hubspotId
        }
      };
    }

    // Find pipeline by ID or label
    let targetPipeline = null;
    if (pipeline) {
      targetPipeline = pipelines.find(p => p.hubspotId === pipeline || p.label.toLowerCase() === pipeline.toLowerCase());
      
      if (!targetPipeline) {
        return {
          isValid: false,
          error: `Invalid pipeline: '${pipeline}'. Available pipelines: ${pipelines.map(p => p.label).join(', ')}`
        };
      }
    } else {
      // Use first pipeline if not specified
      targetPipeline = pipelines[0];
    }

    // Get stages for the pipeline
    const stages = await storage.getHubspotStages(targetPipeline.id);
    if (stages.length === 0) {
      return {
        isValid: false,
        error: `No stages found for pipeline '${targetPipeline.label}'`
      };
    }

    // Find stage by ID or label
    let targetStage = null;
    if (dealstage) {
      targetStage = stages.find(s => s.hubspotId === dealstage || s.label.toLowerCase() === dealstage.toLowerCase());
      
      if (!targetStage) {
        return {
          isValid: false,
          error: `Invalid stage: '${dealstage}' for pipeline '${targetPipeline.label}'. Available stages: ${stages.map(s => s.label).join(', ')}`
        };
      }
    } else {
      // Use first stage if not specified
      targetStage = stages[0];
    }

    return {
      isValid: true,
      resolvedData: {
        ...dealData,
        pipeline: targetPipeline.hubspotId,
        dealstage: targetStage.hubspotId
      }
    };

  } catch (error: any) {
    console.error('Error validating deal stage:', error.message);
    return {
      isValid: false,
      error: `Stage validation failed: ${error.message}`
    };
  }
}

