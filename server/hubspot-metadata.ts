/**
 * HubSpot CRM Metadata Service
 * Fetches pipeline/stage data and other CRM constraints to ensure valid data generation
 */

import { rateLimiter } from './rate-limiter';

interface Pipeline {
  id: string;
  label: string;
  displayOrder: number;
  stages: Stage[];
}

interface Stage {
  id: string;
  label: string;
  displayOrder: number;
  metadata: {
    isClosed?: boolean;
    probability?: number;
  };
}

interface TicketPipeline {
  id: string;
  label: string;
  stages: TicketStage[];
}

interface TicketStage {
  id: string;
  label: string;
  displayOrder: number;
}

interface CrmMetadata {
  dealPipelines: Pipeline[];
  ticketPipelines: TicketPipeline[];
  owners: Array<{ id: string; email: string; firstName: string; lastName: string }>;
  lastFetched: number;
}

// Cache CRM metadata for 1 hour
const METADATA_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const metadataCache = new Map<string, { data: CrmMetadata; expires: number }>();

/**
 * Fetch all CRM metadata needed for simulation
 */
export async function fetchCrmMetadata(token: string, userId: number): Promise<CrmMetadata> {
  const cacheKey = `metadata_${userId}`;
  const cached = metadataCache.get(cacheKey);
  
  if (cached && cached.expires > Date.now()) {
    console.log(`📋 Using cached CRM metadata for user ${userId}`);
    return cached.data;
  }
  
  console.log(`🔍 Fetching fresh CRM metadata for user ${userId}`);
  
  try {
    const [dealPipelines, ticketPipelines, owners] = await Promise.all([
      fetchDealPipelines(token),
      fetchTicketPipelines(token),
      fetchOwners(token)
    ]);
    
    const metadata: CrmMetadata = {
      dealPipelines,
      ticketPipelines,
      owners,
      lastFetched: Date.now()
    };
    
    // Cache for 1 hour
    metadataCache.set(cacheKey, {
      data: metadata,
      expires: Date.now() + METADATA_CACHE_TTL
    });
    
    console.log(`✅ Cached CRM metadata: ${dealPipelines.length} deal pipelines, ${ticketPipelines.length} ticket pipelines, ${owners.length} owners`);
    return metadata;
    
  } catch (error: any) {
    console.error('Error fetching CRM metadata:', error.message);
    throw new Error(`Failed to fetch CRM metadata: ${error.message}`);
  }
}

/**
 * Fetch deal pipelines and stages
 */
async function fetchDealPipelines(token: string): Promise<Pipeline[]> {
  return await rateLimiter.executeWithRateLimit('hubspot', async () => {
    const response = await fetch('https://api.hubapi.com/crm/v3/pipelines/deals', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HubSpot pipelines API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data.results.map((pipeline: any) => ({
      id: pipeline.id,
      label: pipeline.label,
      displayOrder: pipeline.displayOrder,
      stages: pipeline.stages.map((stage: any) => ({
        id: stage.id,
        label: stage.label,
        displayOrder: stage.displayOrder,
        metadata: stage.metadata || {}
      }))
    }));
  });
}

/**
 * Fetch ticket pipelines and stages
 */
async function fetchTicketPipelines(token: string): Promise<TicketPipeline[]> {
  return await rateLimiter.executeWithRateLimit('hubspot', async () => {
    const response = await fetch('https://api.hubapi.com/crm/v3/pipelines/tickets', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HubSpot ticket pipelines API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data.results.map((pipeline: any) => ({
      id: pipeline.id,
      label: pipeline.label,
      stages: pipeline.stages.map((stage: any) => ({
        id: stage.id,
        label: stage.label,
        displayOrder: stage.displayOrder
      }))
    }));
  });
}

/**
 * Fetch HubSpot owners
 */
async function fetchOwners(token: string): Promise<Array<{ id: string; email: string; firstName: string; lastName: string }>> {
  return await rateLimiter.executeWithRateLimit('hubspot', async () => {
    const response = await fetch('https://api.hubapi.com/crm/v3/owners?limit=100', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HubSpot owners API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data.results.map((owner: any) => ({
      id: owner.id,
      email: owner.email,
      firstName: owner.firstName,
      lastName: owner.lastName
    }));
  });
}

/**
 * Get valid deal pipeline and stage options for LLM prompts
 */
export function getDealPipelineOptions(metadata: CrmMetadata): string {
  if (!metadata.dealPipelines.length) {
    return 'No deal pipelines available';
  }
  
  const options = metadata.dealPipelines.map(pipeline => {
    const stages = pipeline.stages.map(stage => `"${stage.id}"`).join(', ');
    return `Pipeline "${pipeline.id}" (${pipeline.label}) with stages: ${stages}`;
  }).join('\n');
  
  return `Available deal pipelines and stages:\n${options}`;
}

/**
 * Get valid ticket pipeline and stage options for LLM prompts
 */
export function getTicketPipelineOptions(metadata: CrmMetadata): string {
  if (!metadata.ticketPipelines.length) {
    return 'No ticket pipelines available';
  }
  
  const options = metadata.ticketPipelines.map(pipeline => {
    const stages = pipeline.stages.map(stage => `"${stage.id}"`).join(', ');
    return `Pipeline "${pipeline.id}" (${pipeline.label}) with stages: ${stages}`;
  }).join('\n');
  
  return `Available ticket pipelines and stages:\n${options}`;
}

/**
 * Get valid owner options for LLM prompts
 */
export function getOwnerOptions(metadata: CrmMetadata): string {
  if (!metadata.owners.length) {
    return 'No owners available';
  }
  
  const options = metadata.owners.map(owner => 
    `"${owner.id}" (${owner.firstName} ${owner.lastName} - ${owner.email})`
  ).join(', ');
  
  return `Available owners: ${options}`;
}

/**
 * Get default deal pipeline and stage IDs
 */
export function getDefaultDealPipelineStage(metadata: CrmMetadata): { pipeline: string; stage: string } {
  if (!metadata.dealPipelines.length) {
    throw new Error('No deal pipelines available');
  }
  
  const defaultPipeline = metadata.dealPipelines.find(p => p.label.toLowerCase().includes('default')) 
                         || metadata.dealPipelines[0];
  
  const defaultStage = defaultPipeline.stages[0];
  
  return {
    pipeline: defaultPipeline.id,
    stage: defaultStage.id
  };
}

/**
 * Get default ticket pipeline and stage IDs
 */
export function getDefaultTicketPipelineStage(metadata: CrmMetadata): { pipeline: string; stage: string } {
  if (!metadata.ticketPipelines.length) {
    throw new Error('No ticket pipelines available');
  }
  
  const defaultPipeline = metadata.ticketPipelines.find(p => p.label.toLowerCase().includes('default'))
                         || metadata.ticketPipelines[0];
  
  const defaultStage = defaultPipeline.stages[0];
  
  return {
    pipeline: defaultPipeline.id,
    stage: defaultStage.id
  };
}

/**
 * Validate if a pipeline/stage combination is valid
 */
export function validateDealPipelineStage(metadata: CrmMetadata, pipelineId: string, stageId: string): boolean {
  const pipeline = metadata.dealPipelines.find(p => p.id === pipelineId);
  if (!pipeline) return false;
  
  return pipeline.stages.some(s => s.id === stageId);
}

/**
 * Validate if a ticket pipeline/stage combination is valid
 */
export function validateTicketPipelineStage(metadata: CrmMetadata, pipelineId: string, stageId: string): boolean {
  const pipeline = metadata.ticketPipelines.find(p => p.id === pipelineId);
  if (!pipeline) return false;
  
  return pipeline.stages.some(s => s.id === stageId);
}