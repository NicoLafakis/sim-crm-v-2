import { storage } from './storage';
import { Simulation, InsertJob, InsertJobStep } from '../shared/schema';
import { readFileSync } from 'fs';
import { join } from 'path';
import OpenAI from 'openai';

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
  acceleratorDays: number
): Promise<{ jobId: number; stepsCount: number }> {
  try {
    // Determine which CSV template to use based on industry and outcome
    let csvFileName = 'universal_30day_timing_key.csv'; // Default
    
    if (simulation.industry?.toLowerCase() === 'ecommerce') {
      if (outcome?.toLowerCase() === 'won') {
        csvFileName = 'Ecommerce_Cycle-ClosedWon_1755104746839.csv';
      } else if (outcome?.toLowerCase() === 'lost') {
        csvFileName = 'Ecommerce_Cycle-ClosedLost_1755104746839.csv';
      }
    }
    
    // Load industry-specific CSV template
    const csvPath = join(process.cwd(), 'attached_assets', csvFileName);
    let csvContent: string;
    
    console.log(`Loading CSV template: ${csvFileName} for industry: ${simulation.industry}, outcome: ${outcome}`);
    
    try {
      csvContent = readFileSync(csvPath, 'utf-8');
    } catch (fileError) {
      console.error(`Error reading CSV template ${csvFileName}:`, fileError);
      
      // Fallback to universal template if industry-specific template fails
      try {
        console.log('Falling back to universal template');
        const fallbackPath = join(process.cwd(), 'attached_assets', 'universal_30day_timing_key.csv');
        csvContent = readFileSync(fallbackPath, 'utf-8');
        csvFileName = 'universal_30day_timing_key.csv';
      } catch (fallbackError) {
        console.error('Error reading fallback CSV template:', fallbackError);
        throw new Error('No CSV template file found');
      }
    }
    
    // Parse CSV content (skip header row)
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
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
    
    console.log(`Parsed ${rows.length} rows from CSV template`);

    // For Ecommerce templates, use all rows as they are outcome-specific already
    // For universal template, filter by outcome
    const filteredRows = csvFileName.includes('Ecommerce') 
      ? rows  // Use all rows for Ecommerce templates
      : rows.filter(row => 
          row.originalSource === 'universal' || 
          row.originalSource === outcome ||
          row.originalSource.toLowerCase().includes(outcome)
        );
    
    console.log(`Filtered to ${filteredRows.length} rows for execution`);
    
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
        csvSource: csvFileName
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
  token?: string
): Promise<{ resolvedRecordId: string; resolvedAssociations: any }> {
  // Get job context (mapping of template IDs to actual CRM IDs)
  const context = await storage.getJobContext(jobId);
  
  // Resolve recordIdTpl
  let resolvedRecordId = recordIdTpl;
  if (recordIdTpl && context[recordIdTpl]) {
    resolvedRecordId = context[recordIdTpl];
    console.log(`✓ Resolved recordIdTpl "${recordIdTpl}" -> "${resolvedRecordId}"`);
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
      } else if (typeof obj === 'string' && ENABLE_SEARCH_FALLBACK && token && stepData) {
        // Try search fallback for missing template references
        const searchResult = await searchFallbackForTemplate(obj, stepData, token);
        if (searchResult.found && searchResult.recordId) {
          // Cache the found ID in context for future use
          await storeRecordIdInContext(jobId, obj, searchResult.recordId);
          console.log(`✓ Search fallback resolved "${obj}" -> "${searchResult.recordId}"`);
          return searchResult.recordId;
        }
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

        // Resolve template references before execution (with search fallback)
        const { resolvedRecordId, resolvedAssociations } = await resolveTemplateReferences(
          step.jobId, 
          step.recordIdTpl || '', 
          step.associationsTpl || {},
          step.actionTpl || undefined,
          hubspotToken || undefined
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
    
    // Generate realistic data using LLM based on theme/industry
    const generatedData = await generateRealisticData(typeOfAction, job.theme, job.industry, actionTpl);
    
    // Get HubSpot API token for the user
    const hubspotToken = await getHubSpotToken(job.simulationId);
    if (!hubspotToken) {
      throw new Error('HubSpot API token not found. Please connect HubSpot account.');
    }
    
    // Execute the specific action
    switch (typeOfAction) {
      case 'create_contact':
        return await executeCreateContact(generatedData, hubspotToken);
        
      case 'create_company':
        return await executeCreateCompany(generatedData, hubspotToken);
        
      case 'create_deal':
        return await executeCreateDeal(generatedData, hubspotToken, step);
        
      case 'create_note':
        return await executeCreateNote(generatedData, hubspotToken, step);
        
      case 'create_ticket':
        return await executeCreateTicket(generatedData, hubspotToken, step);
        
      case 'update_deal':
        return await executeUpdateDeal(generatedData, hubspotToken, step);
        
      case 'update_ticket':
        return await executeUpdateTicket(generatedData, hubspotToken, step);
        
      case 'close_ticket':
        return await executeCloseTicket(generatedData, hubspotToken, step);
        
      default:
        throw new Error(`Unknown action type: ${typeOfAction}`);
    }
    
  } catch (error: any) {
    console.error(`Error executing job step ${step.id}:`, error.message);
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
 * Generate realistic data using LLM based on theme, industry, and action template
 */
async function generateRealisticData(actionType: string, theme: string, industry: string, actionTemplate: any): Promise<any> {
  const cacheKey = `${theme}_${industry}_${actionType}`;
  
  // Check cache first
  if (personaCache.has(cacheKey)) {
    const cachedData = personaCache.get(cacheKey);
    // Add some variation to cached data
    return addVariationToPersonaData(cachedData, actionType);
  }
  
  try {
    const prompt = createLLMPrompt(actionType, theme, industry, actionTemplate);
    
    // Try primary model first
    let response;
    try {
      response = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          {
            role: "system",
            content: "You are an expert CRM data generator. Generate realistic business data that fits the specified theme and industry. Respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });
    } catch (primaryError: any) {
      console.warn(`Primary model gpt-5-nano failed: ${primaryError.message}. Trying fallback model.`);
      
      // Fallback to secondary model
      response = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          {
            role: "system",
            content: "You are an expert CRM data generator. Generate realistic business data that fits the specified theme and industry. Respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });
    }

    const generatedData = JSON.parse(response.choices[0].message.content || '{}');
    
    // Cache the generated data
    personaCache.set(cacheKey, generatedData);
    
    return generatedData;
    
  } catch (error: any) {
    console.error('Error generating realistic data with LLM (both models failed):', error.message);
    // Fallback to template data if both LLM models fail
    return actionTemplate || {};
  }
}

/**
 * Create LLM prompt based on action type, theme, and industry
 */
function createLLMPrompt(actionType: string, theme: string, industry: string, template: any): string {
  const basePrompt = `Generate realistic ${actionType.replace('_', ' ')} data for a ${theme}-themed ${industry} business simulation.`;
  
  switch (actionType) {
    case 'create_contact':
      return `${basePrompt} Generate a contact with firstName, lastName, email, phone, and jobTitle that fits the ${theme} theme in the ${industry} industry. Make it creative but professional. Return JSON with these fields: {"firstName": "", "lastName": "", "email": "", "phone": "", "jobTitle": "", "company": ""}`;
      
    case 'create_company':
      return `${basePrompt} Generate a company with name, domain, city, state, industry, and employee count that fits the ${theme} theme. Be creative but realistic. Return JSON with: {"name": "", "domain": "", "city": "", "state": "", "industry": "", "numberofemployees": ""}`;
      
    case 'create_deal':
      return `${basePrompt} Generate a deal with name and amount that fits the ${theme} theme in ${industry}. You can use common stage names like "Qualified Lead", "Appointment Scheduled", "Decision Maker Bought-In", "Contract Sent", or "Closed Won". Return JSON with: {"dealname": "", "amount": "", "dealstage": "Qualified Lead", "pipeline": "default"}`;
      
    case 'create_note':
      return `${basePrompt} Generate a professional note body for a ${theme}-themed ${industry} business interaction. Keep it under 200 characters. Return JSON with: {"hs_note_body": ""}`;
      
    case 'create_ticket':
      return `${basePrompt} Generate a support ticket with subject and content for ${theme}-themed ${industry} business. Return JSON with: {"subject": "", "content": "", "hs_pipeline_stage": "1"}`;
      
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
    
    // Get HubSpot token for the user
    const token = await storage.getApiTokenByService(simulation.userId, 'hubspot');
    return token?.accessToken || null;
  } catch (error) {
    console.error('Error getting HubSpot token:', error);
    return null;
  }
}

/**
 * Execute contact creation with deduplication
 */
async function executeCreateContact(data: any, token: string): Promise<any> {
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

  // Validate and ensure properties exist
  await ensureHubSpotProperties('contacts', Object.keys(data), token);
  
  // Create contact via HubSpot API
  const response = await makeHubSpotRequest('POST', '/crm/v3/objects/contacts', {
    properties: data
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
async function executeCreateCompany(data: any, token: string): Promise<any> {
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

  // Validate and ensure properties exist
  await ensureHubSpotProperties('companies', Object.keys(data), token);
  
  // Create company via HubSpot API
  const response = await makeHubSpotRequest('POST', '/crm/v3/objects/companies', {
    properties: data
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
  console.log(`✅ Deal stage validation passed. Pipeline: ${validatedData.pipeline}, Stage: ${validatedData.dealstage}`);

  // Check for existing deal if search fallback is enabled and dealname exists
  if (ENABLE_SEARCH_FALLBACK && validatedData.dealname) {
    const searchResult = await searchDeal(validatedData.dealname, token);
    
    if (searchResult.found) {
      if (searchResult.ambiguous) {
        return {
          success: false,
          error: `Ambiguous deal match for name: ${validatedData.dealname}`,
          action: 'create_deal',
          timestamp: new Date().toISOString()
        };
      } else if (searchResult.recordId) {
        console.log(`🔍 Deduplication: Using existing deal ${searchResult.recordId} for ${validatedData.dealname}`);
        
        // Still handle associations for existing deal
        if (step.associationsTpl && Object.keys(step.associationsTpl).length > 0) {
          await createAssociations(searchResult.recordId, 'deals', step.associationsTpl, token);
        }
        
        return {
          success: true,
          recordId: searchResult.recordId,
          action: 'create_deal',
          data: validatedData,
          deduplicated: true,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  // Validate and ensure properties exist
  await ensureHubSpotProperties('deals', Object.keys(validatedData), token);
  
  // Create deal via HubSpot API
  const response = await makeHubSpotRequest('POST', '/crm/v3/objects/deals', {
    properties: validatedData
  }, token);
  
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
  // Add ISO timestamp for HubSpot
  data.hs_timestamp = new Date().toISOString();
  
  // Create note via HubSpot API
  const response = await makeHubSpotRequest('POST', '/crm/v3/objects/notes', {
    properties: data
  }, token);
  
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
  // Validate and ensure properties exist
  await ensureHubSpotProperties('tickets', Object.keys(data), token);
  
  // Create ticket via HubSpot API
  const response = await makeHubSpotRequest('POST', '/crm/v3/objects/tickets', {
    properties: data
  }, token);
  
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
  
  // Update deal via HubSpot API
  const response = await makeHubSpotRequest('PATCH', `/crm/v3/objects/deals/${dealId}`, {
    properties: data
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
  
  // Update ticket via HubSpot API
  const response = await makeHubSpotRequest('PATCH', `/crm/v3/objects/tickets/${ticketId}`, {
    properties: data
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
  
  // Close ticket via HubSpot API
  const response = await makeHubSpotRequest('PATCH', `/crm/v3/objects/tickets/${ticketId}`, {
    properties: data
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
 * Ensure HubSpot properties exist for the given object type
 */
async function ensureHubSpotProperties(objectType: string, propertyNames: string[], token: string): Promise<void> {
  try {
    // Get existing properties
    const existingProperties = await makeHubSpotRequest('GET', `/crm/v3/properties/${objectType}`, null, token);
    const existingNames = new Set(existingProperties.results.map((prop: any) => prop.name));
    
    // Check which properties are missing
    const missingProperties = propertyNames.filter(name => !existingNames.has(name));
    
    // Create missing properties
    for (const propertyName of missingProperties) {
      const propertyConfig = createPropertyConfig(propertyName, objectType);
      try {
        await makeHubSpotRequest('POST', `/crm/v3/properties/${objectType}`, propertyConfig, token);
        console.log(`Created missing property: ${propertyName} for ${objectType}`);
      } catch (error: any) {
        console.warn(`Failed to create property ${propertyName}:`, error.message);
        // Continue with other properties
      }
    }
  } catch (error: any) {
    console.warn(`Error ensuring properties for ${objectType}:`, error.message);
    // Continue execution even if property validation fails
  }
}

/**
 * Create property configuration for HubSpot
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
 * Determine property type based on property name
 */
function getPropertyType(propertyName: string): string {
  if (propertyName.includes('email')) return 'string';
  if (propertyName.includes('phone')) return 'string';
  if (propertyName.includes('amount') || propertyName.includes('number')) return 'number';
  if (propertyName.includes('date') || propertyName.includes('timestamp')) return 'datetime';
  return 'string';
}

/**
 * Determine field type based on property name
 */
function getFieldType(propertyName: string): string {
  if (propertyName.includes('email')) return 'email';
  if (propertyName.includes('phone')) return 'phonenumber';
  if (propertyName.includes('amount') || propertyName.includes('number')) return 'number';
  if (propertyName.includes('date') || propertyName.includes('timestamp')) return 'date';
  return 'text';
}

/**
 * Create associations between HubSpot records
 */
async function createAssociations(fromObjectId: string, fromObjectType: string, associations: any, token: string): Promise<void> {
  for (const [toObjectType, toObjectIdTemplate] of Object.entries(associations)) {
    try {
      const toObjectId = extractRecordId(toObjectIdTemplate as string);
      
      await makeHubSpotRequest('PUT', `/crm/v4/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}/${toObjectId}`, {
        associationCategory: 'HUBSPOT_DEFINED',
        associationTypeId: getAssociationTypeId(fromObjectType, toObjectType as string)
      }, token);
      
      console.log(`Created association: ${fromObjectType}:${fromObjectId} -> ${toObjectType}:${toObjectId}`);
    } catch (error: any) {
      console.warn(`Failed to create association from ${fromObjectType} to ${toObjectType}:`, error.message);
    }
  }
}

/**
 * Get association type ID for HubSpot associations
 */
function getAssociationTypeId(fromType: string, toType: string): number {
  // Standard HubSpot association type IDs
  const associationMap: Record<string, Record<string, number>> = {
    'deals': { 'contacts': 3, 'companies': 5 },
    'notes': { 'contacts': 202, 'companies': 190, 'deals': 214 },
    'tickets': { 'contacts': 16, 'companies': 25, 'deals': 28 }
  };
  
  return associationMap[fromType]?.[toType] || 1;
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
 * Make HTTP request to HubSpot API
 */
async function makeHubSpotRequest(method: string, endpoint: string, data: any, token: string): Promise<any> {
  const url = `https://api.hubapi.com${endpoint}`;
  
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
    throw new Error(`HubSpot API error (${response.status}): ${errorData}`);
  }
  
  return await response.json();
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