/**
 * Simple test script to verify Marvel sequence endpoint via API call
 */

async function testMarvelSequence() {
  try {
    console.log('🎬 Testing Marvel Sequence via API...\n');
    
    const response = await fetch('http://localhost:5000/api/test-marvel-sequence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('\n📊 TEST COMPLETED');
    console.log('='.repeat(50));
    console.log(`Message: ${data.message}`);
    console.log(`Total Steps: ${data.summary.totalSteps}`);
    console.log(`Successful: ${data.summary.successful}`);
    console.log(`Failed: ${data.summary.failed}`);
    console.log(`Success Rate: ${data.summary.successRate}`);
    
    if (data.results && data.results.length > 0) {
      console.log('\n📋 DETAILED RESULTS:');
      data.results.forEach((result, index) => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        const details = result.recordId ? ` | ID: ${result.recordId}` : '';
        const error = result.error ? ` | Error: ${result.error}` : '';
        console.log(`${index + 1}. ${status} | ${result.step}${details}${error}`);
      });
    }
    
    return data;
  } catch (error) {
    console.error('❌ Test Error:', error.message);
    throw error;
  }
}

// Run the test if this file is executed directly
testMarvelSequence()
  .then(() => console.log('\n✅ Test script completed'))
  .catch(err => console.error('\n❌ Test script failed:', err.message));