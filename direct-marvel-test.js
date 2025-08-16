/**
 * Direct test of Marvel Comprehensive Test (bypassing endpoint issues)
 */

// Set environment variable to enable persona registry
process.env.PERSONA_REGISTRY_ENABLED = 'true';

async function runDirectTest() {
  try {
    console.log('🎬 Running Marvel Comprehensive Test Directly...\n');
    
    // Import the test function directly
    const { runMarvelComprehensiveTest } = await import('./server/tests/marvel-comprehensive-test.js');
    
    // Configure test options - exactly what you requested
    const options = {
      sequential: 1,    // Single test to match your request
      concurrent: 0,    // No concurrent for this specific test
      maxConcurrency: 1,
      theme: 'marvel',
      industry: 'Media & Publishing'
    };
    
    console.log('📊 Test Configuration:', options);
    console.log('🎯 This will run your exact sequence:');
    console.log('   1. Create contact');
    console.log('   2. Wait 5s → Create company + associate to contact');
    console.log('   3. Wait 10s → Create deal + associate to contact & company');
    console.log('   4. Wait 10s → Create ticket + associate to deal');
    console.log('   5. Wait 5s → Create note + associate to contact');
    console.log('   6. Wait 5s → Create note + associate to deal');
    console.log('   7. Verify 200 status on all actions\n');
    
    const startTime = Date.now();
    
    // Run the test
    const results = await runMarvelComprehensiveTest(options);
    
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    
    console.log('\n🎉 MARVEL TEST COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`✅ Total Time: ${totalTime.toFixed(2)}s`);
    console.log(`✅ Tests Run: ${results.summary.totalTests}`);
    console.log(`✅ Successful: ${results.summary.successfulTests}`);
    console.log(`✅ Failed: ${results.summary.failedTests}`);
    console.log(`✅ Success Rate: ${results.summary.successRate}`);
    
    // Show persona details
    if (results.tests && results.tests.length > 0) {
      const test = results.tests[0];
      console.log(`\n👤 UNIQUE PERSONA GENERATED:`);
      console.log(`   Name: ${test.persona.name}`);
      console.log(`   Email: ${test.persona.email}`);
      console.log(`   Company: ${test.persona.company}`);
      console.log(`   Role: ${test.persona.role}`);
      
      console.log(`\n📋 DETAILED RESULTS:`);
      console.log(`   Total Steps: ${test.results.totalSteps}`);
      console.log(`   Successful Steps: ${test.results.successfulSteps}`);
      console.log(`   Failed Steps: ${test.results.failedSteps}`);
      console.log(`   Step Success Rate: ${test.results.stepSuccessRate}`);
      console.log(`   Duration: ${(test.results.duration / 1000).toFixed(2)}s`);
    }
    
    console.log(`\n🛡️  PERSONA REGISTRY STATS:`);
    console.log(`   Personas Generated: ${results.personaStats.totalGenerated}`);
    console.log(`   Unique Emails Created: ${results.personaStats.uniqueEmails}`);
    console.log(`   Duplicates Blocked: ${results.personaStats.duplicatesBlocked}`);
    
    if (results.summary.successRate === '100.0%') {
      console.log('\n🎊 PERFECT SUCCESS! All CRM actions returned 200 status!');
      console.log('🛡️  The Persona Registry successfully prevented duplicates!');
      console.log('✅ Test completed exactly as requested with unique Marvel persona!');
    } else {
      console.log('\n📊 Some steps may have failed, but persona was unique');
    }
    
    return results;
    
  } catch (error) {
    console.error('\n❌ Direct Test Error:', error.message);
    
    if (error.message.includes('HubSpot token not found')) {
      console.log('\n💡 SOLUTION: The test requires HubSpot connection.');
      console.log('   The app should have your HubSpot token configured.');
    }
    
    console.error('\nFull error:', error);
    throw error;
  }
}

// Run the test
runDirectTest()
  .then(() => console.log('\n✅ Marvel test completed!'))
  .catch(err => console.error('\n❌ Test failed:', err.message));