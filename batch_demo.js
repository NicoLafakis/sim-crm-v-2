#!/usr/bin/env node

/**
 * Demo script showing how batch APIs reduce API call volume
 * This simulates the association creation process to demonstrate efficiency gains
 */

// Simulate the CSV data structure for demonstration
const simulationData = [
  {
    recordId: 'deal_1',
    recordType: 'deal',
    associations: ['contact_1', 'company_1'], // 2 associations
    associationType: 'deal_to_contact|deal_to_company'
  },
  {
    recordId: 'deal_2', 
    recordType: 'deal',
    associations: ['contact_2', 'company_2'], // 2 associations
    associationType: 'deal_to_contact|deal_to_company'
  },
  {
    recordId: 'ticket_1',
    recordType: 'ticket', 
    associations: ['contact_1', 'company_1'], // 2 associations
    associationType: 'ticket_to_contact|ticket_to_company'
  },
  {
    recordId: 'note_1',
    recordType: 'note',
    associations: ['contact_1'], // 1 association
    associationType: 'note_to_contact'
  }
];

console.log('🔍 Batch API Efficiency Analysis\n');

// Count individual API calls vs batch API calls
let individualApiCalls = 0;
let batchApiCalls = 0;
let totalAssociations = 0;

console.log('📊 Processing simulation data:');

simulationData.forEach((record, index) => {
  const associationCount = record.associations.length;
  totalAssociations += associationCount;
  
  console.log(`\n${index + 1}. Record: ${record.recordId} (${record.recordType})`);
  console.log(`   Associations: ${associationCount} (${record.associations.join(', ')})`);
  
  // Individual API approach: 1 call per association
  individualApiCalls += associationCount;
  
  // Batch API approach: 1 call per record (regardless of association count)
  batchApiCalls += 1;
  
  console.log(`   Individual API calls: ${associationCount}`);
  console.log(`   Batch API calls: 1`);
});

console.log('\n' + '='.repeat(50));
console.log('📈 EFFICIENCY COMPARISON');
console.log('='.repeat(50));

console.log(`Total records processed: ${simulationData.length}`);
console.log(`Total associations created: ${totalAssociations}`);
console.log(`\nIndividual API approach: ${individualApiCalls} API calls`);
console.log(`Batch API approach: ${batchApiCalls} API calls`);

const reductionCount = individualApiCalls - batchApiCalls;
const reductionPercentage = ((reductionCount / individualApiCalls) * 100).toFixed(1);

console.log(`\n🎯 SAVINGS:`);
console.log(`- Fewer API calls: ${reductionCount}`);
console.log(`- Reduction percentage: ${reductionPercentage}%`);
console.log(`- Rate limit efficiency: ${reductionPercentage}% better utilization`);

console.log('\n💡 Benefits:');
console.log('- Reduced network overhead');
console.log('- Better rate limit utilization');
console.log('- Faster association creation');
console.log('- Lower risk of hitting API limits');
console.log('- More reliable large-scale simulations');

// Simulate a large-scale scenario
console.log('\n' + '='.repeat(50));
console.log('🚀 LARGE SCALE SIMULATION (36 prospect sets)');
console.log('='.repeat(50));

const largeScaleRecords = 36 * 4; // 36 sets * 4 records each (company, contact, deal, ticket)
const averageAssociations = 1.5; // Average associations per record
const totalLargeAssociations = largeScaleRecords * averageAssociations;

console.log(`Records in full simulation: ${largeScaleRecords}`);
console.log(`Average associations per record: ${averageAssociations}`);
console.log(`Total associations: ${totalLargeAssociations}`);

const largeIndividualCalls = totalLargeAssociations;
const largeBatchCalls = largeScaleRecords;

console.log(`\nIndividual API calls: ${largeIndividualCalls}`);
console.log(`Batch API calls: ${largeBatchCalls}`);

const largeSavings = largeIndividualCalls - largeBatchCalls;
const largeSavingsPercent = ((largeSavings / largeIndividualCalls) * 100).toFixed(1);

console.log(`\nAPI call savings: ${largeSavings} (${largeSavingsPercent}% reduction)`);
console.log('This reduction is crucial for staying within HubSpot rate limits!');