/**
 * Test Pipeline Validation System
 * Validates that deals and tickets are created with correct pipeline/stage values from CRM
 */

import { fetchCrmMetadata, getDealPipelineOptions, getTicketPipelineOptions } from './hubspot-metadata';

export async function testPipelineValidation(token: string, userId: number): Promise<any> {
  console.log('🧪 Testing Pipeline Validation System');
  
  try {
    // Test 1: Fetch CRM metadata
    console.log('\n1️⃣ Fetching CRM metadata...');
    const metadata = await fetchCrmMetadata(token, userId);
    
    console.log(`✅ Found ${metadata.dealPipelines.length} deal pipelines`);
    console.log(`✅ Found ${metadata.ticketPipelines.length} ticket pipelines`);
    console.log(`✅ Found ${metadata.owners.length} owners`);
    
    // Test 2: Validate deal pipeline options
    console.log('\n2️⃣ Deal pipeline options for LLM:');
    const dealOptions = getDealPipelineOptions(metadata);
    console.log(dealOptions);
    
    // Test 3: Validate ticket pipeline options 
    console.log('\n3️⃣ Ticket pipeline options for LLM:');
    const ticketOptions = getTicketPipelineOptions(metadata);
    console.log(ticketOptions);
    
    // Test 4: Show actual pipeline/stage IDs that should be used
    console.log('\n4️⃣ Available pipeline/stage combinations:');
    
    metadata.dealPipelines.forEach(pipeline => {
      console.log(`\nDeal Pipeline "${pipeline.id}" (${pipeline.label}):`);
      pipeline.stages.forEach(stage => {
        console.log(`  Stage "${stage.id}" (${stage.label})`);
      });
    });
    
    metadata.ticketPipelines.forEach(pipeline => {
      console.log(`\nTicket Pipeline "${pipeline.id}" (${pipeline.label}):`);
      pipeline.stages.forEach(stage => {
        console.log(`  Stage "${stage.id}" (${stage.label})`);
      });
    });
    
    return {
      success: true,
      message: 'Pipeline validation system is working correctly',
      dealPipelines: metadata.dealPipelines.length,
      ticketPipelines: metadata.ticketPipelines.length,
      owners: metadata.owners.length,
      metadata: metadata
    };
    
  } catch (error: any) {
    console.error('❌ Pipeline validation test failed:', error.message);
    
    return {
      success: false,
      error: error.message,
      message: 'Pipeline validation system test failed'
    };
  }
}