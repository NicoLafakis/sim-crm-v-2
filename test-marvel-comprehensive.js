/**
 * Test script for Marvel Comprehensive Test with Persona Registry
 */

async function testMarvelComprehensive() {
  try {
    console.log('🎬 Testing Marvel Comprehensive Test with Persona Registry...\n');
    
    // Test options - you can modify these
    const testOptions = {
      sequential: 3,    // Number of sequential tests
      concurrent: 2,    // Number of concurrent tests  
      maxConcurrency: 2, // Max concurrent tests to run at once
      theme: 'marvel',
      industry: 'Media & Publishing'
    };
    
    console.log('📊 Test Configuration:', testOptions);
    console.log('\n🚀 Starting comprehensive test...\n');
    
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:5000/api/test-marvel-comprehensive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testOptions)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const endTime = Date.now();
    const clientDuration = endTime - startTime;
    
    console.log('\n🎉 COMPREHENSIVE TEST COMPLETED');
    console.log('='.repeat(60));
    console.log(`Client Duration: ${(clientDuration / 1000).toFixed(2)}s`);
    console.log(`Server Duration: ${(data.totalDuration / 1000).toFixed(2)}s`);
    console.log(`Message: ${data.message}\n`);
    
    console.log('📊 OVERALL RESULTS:');
    console.log(`Total Tests: ${data.totalTests}`);
    console.log(`Successful: ${data.successfulTests}`);
    console.log(`Failed: ${data.failedTests}`);
    console.log(`Success Rate: ${data.successRate}`);
    console.log(`Avg Duration per Test: ${(data.avgDurationPerTest / 1000).toFixed(2)}s\n`);
    
    console.log('👥 PERSONA STATISTICS:');
    console.log(`Total Generated: ${data.personaStats.totalGenerated}`);
    console.log(`Unique Emails: ${data.personaStats.uniqueEmails}`);
    console.log(`Duplicates Blocked: ${data.personaStats.duplicatesBlocked}\n`);
    
    if (data.tests && data.tests.length > 0) {
      console.log('📋 INDIVIDUAL TEST RESULTS:');
      
      // Group results
      const successful = data.tests.filter(t => t.results.failedSteps === 0);
      const failed = data.tests.filter(t => t.results.failedSteps > 0);
      
      if (successful.length > 0) {
        console.log(`\n✅ SUCCESSFUL TESTS (${successful.length}):`);
        successful.forEach((test, index) => {
          console.log(`${index + 1}. ${test.testName}`);
          console.log(`   👤 ${test.persona.name} (${test.persona.email})`);
          console.log(`   🏢 ${test.persona.company} - ${test.persona.role}`);
          console.log(`   📈 Steps: ${test.results.successfulSteps}/${test.results.totalSteps} (${test.results.stepSuccessRate})`);
          console.log(`   ⏱️  Duration: ${(test.results.duration / 1000).toFixed(2)}s`);
        });
      }
      
      if (failed.length > 0) {
        console.log(`\n❌ FAILED TESTS (${failed.length}):`);
        failed.forEach((test, index) => {
          console.log(`${index + 1}. ${test.testName}`);
          console.log(`   👤 ${test.persona.name} (${test.persona.email})`);
          console.log(`   🏢 ${test.persona.company} - ${test.persona.role}`);
          console.log(`   📉 Steps: ${test.results.successfulSteps}/${test.results.totalSteps} (${test.results.stepSuccessRate})`);
          console.log(`   ❌ Failed: ${test.results.failedSteps} steps`);
          console.log(`   ⏱️  Duration: ${(test.results.duration / 1000).toFixed(2)}s`);
        });
      }
    }
    
    console.log('\n🎯 ANALYSIS:');
    if (data.successRate === '100.0%') {
      console.log('🎊 Perfect! All tests passed with unique personas.');
      console.log('🛡️  The Persona Registry prevented duplicates successfully.');
    } else if (parseFloat(data.successRate) >= 80) {
      console.log('👍 Good results! Most tests passed with unique personas.');
      console.log('🔍 Check failed tests for any patterns.');
    } else {
      console.log('⚠️  Some issues detected. Review the test setup and HubSpot configuration.');
    }
    
    if (data.personaStats.duplicatesBlocked > 0) {
      console.log(`🚫 Successfully blocked ${data.personaStats.duplicatesBlocked} duplicate personas.`);
    }
    
    console.log('\n✨ Comprehensive test completed successfully!');
    return data;
    
  } catch (error) {
    console.error('❌ Comprehensive Test Error:', error.message);
    
    if (error.message.includes('HubSpot token not found')) {
      console.log('\n💡 SOLUTION: Connect your HubSpot account first:');
      console.log('1. Go to http://localhost:5000 in your browser');
      console.log('2. Navigate to Profile settings');
      console.log('3. Connect your HubSpot account with a valid token');
      console.log('4. Run this test again');
    }
    
    throw error;
  }
}

// Enhanced options for different test scenarios
const testScenarios = {
  quick: {
    sequential: 2,
    concurrent: 1,
    maxConcurrency: 1,
    theme: 'marvel',
    industry: 'Media & Publishing'
  },
  
  standard: {
    sequential: 5,
    concurrent: 5,
    maxConcurrency: 3,
    theme: 'marvel',
    industry: 'Media & Publishing'
  },
  
  stress: {
    sequential: 10,
    concurrent: 10,
    maxConcurrency: 5,
    theme: 'marvel',
    industry: 'Media & Publishing'
  }
};

// Check for command line arguments
const scenario = process.argv[2] || 'quick';

if (testScenarios[scenario]) {
  console.log(`🎯 Running ${scenario} test scenario...`);
  // Override default options with scenario
  const originalTest = testMarvelComprehensive;
  testMarvelComprehensive = () => {
    // Modify the testOptions in the original function
    return originalTest().catch(err => {
      console.error(`\n❌ ${scenario} test failed:`, err.message);
      throw err;
    });
  };
}

// Run the test
testMarvelComprehensive()
  .then(() => console.log('\n✅ Test script completed successfully'))
  .catch(err => console.error('\n❌ Test script failed:', err.message));

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testMarvelComprehensive, testScenarios };
}