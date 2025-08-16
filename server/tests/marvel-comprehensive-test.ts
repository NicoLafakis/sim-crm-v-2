/**
 * Marvel Comprehensive Test using Persona Registry and Test Harness
 * Prevents duplicates, ensures unique personas for each run, handles concurrent testing
 */

import { TestHarness, MARVEL_TEST_SEQUENCE, TestResult } from './test-harness';
import { TestConfig } from './persona-registry';
import { DatabaseStorage } from "../storage";

const storage = new DatabaseStorage();

export interface ComprehensiveTestOptions {
  sequential?: number;
  concurrent?: number;
  maxConcurrency?: number;
  theme?: string;
  industry?: string;
}

export interface ComprehensiveTestResults {
  summary: {
    totalTests: number;
    successfulTests: number;
    failedTests: number;
    successRate: string;
    totalDuration: number;
    avgDurationPerTest: number;
  };
  tests: Array<{
    testId: string;
    testName: string;
    persona: {
      name: string;
      email: string;
      company: string;
      role: string;
    };
    results: {
      totalSteps: number;
      successfulSteps: number;
      failedSteps: number;
      stepSuccessRate: string;
      duration: number;
    };
    status: string;
  }>;
  personaStats: {
    totalGenerated: number;
    uniqueEmails: number;
    duplicatesBlocked: number;
  };
}

/**
 * Run comprehensive Marvel-themed test with persona registry
 */
export async function runMarvelComprehensiveTest(options: ComprehensiveTestOptions = {}): Promise<ComprehensiveTestResults> {
  console.log('🎬 Starting Marvel Comprehensive Test with Persona Registry...\n');
  
  // Default options
  const {
    sequential = 5,
    concurrent = 5,
    maxConcurrency = 3,
    theme = 'marvel',
    industry = 'Media & Publishing'
  } = options;

  const totalTests = sequential + concurrent;
  console.log(`📊 Test Configuration:
  - Sequential Tests: ${sequential}
  - Concurrent Tests: ${concurrent}
  - Max Concurrency: ${maxConcurrency}
  - Theme: ${theme}
  - Industry: ${industry}
  - Total Tests: ${totalTests}\n`);

  // Get user's HubSpot token
  const session = await storage.getSession(1);
  if (!session?.hubspotToken) {
    throw new Error('HubSpot token not found. Please connect your HubSpot account first.');
  }

  const testHarness = new TestHarness(session.hubspotToken);
  const allTestIds: string[] = [];
  const testResults: ComprehensiveTestResults = {
    summary: {
      totalTests,
      successfulTests: 0,
      failedTests: 0,
      successRate: '0%',
      totalDuration: 0,
      avgDurationPerTest: 0
    },
    tests: [],
    personaStats: {
      totalGenerated: totalTests,
      uniqueEmails: 0,
      duplicatesBlocked: 0
    }
  };

  const startTime = Date.now();

  try {
    // Test configuration
    const testConfig: TestConfig = {
      theme,
      industry,
      testMode: 'sequential'
    };

    // Phase 1: Create all test suites (persona generation happens here)
    console.log(`\n🏗️  PHASE 1: Creating ${totalTests} Test Suites with Unique Personas`);
    console.log('='.repeat(70));

    for (let i = 0; i < totalTests; i++) {
      try {
        const testName = `Marvel Test ${i + 1}/${totalTests}`;
        console.log(`Creating ${testName}...`);
        
        const testId = await testHarness.createTestSuite(testName, testConfig, MARVEL_TEST_SEQUENCE);
        allTestIds.push(testId);
        
      } catch (error: any) {
        console.error(`❌ Failed to create test ${i + 1}: ${error.message}`);
        testResults.personaStats.duplicatesBlocked++;
      }
    }

    console.log(`\n✅ Created ${allTestIds.length} test suites successfully`);
    testResults.personaStats.uniqueEmails = allTestIds.length;
    testResults.personaStats.duplicatesBlocked = totalTests - allTestIds.length;

    // Phase 2: Run Sequential Tests
    if (sequential > 0) {
      console.log(`\n🔄 PHASE 2: Running ${Math.min(sequential, allTestIds.length)} Sequential Tests`);
      console.log('='.repeat(70));

      const sequentialTestIds = allTestIds.slice(0, sequential);
      
      for (let i = 0; i < sequentialTestIds.length; i++) {
        const testId = sequentialTestIds[i];
        console.log(`\n📋 Running Sequential Test ${i + 1}/${sequentialTestIds.length}`);
        
        try {
          const results = await testHarness.runTestSuite(testId);
          const testSuite = testHarness.getTestSuite(testId)!;
          
          const successfulSteps = results.filter(r => r.success).length;
          const isTestSuccessful = successfulSteps === results.length;
          
          if (isTestSuccessful) {
            testResults.summary.successfulTests++;
          } else {
            testResults.summary.failedTests++;
          }
          
          testResults.tests.push({
            testId,
            testName: testSuite.name,
            persona: {
              name: testSuite.persona!.name,
              email: testSuite.persona!.email,
              company: testSuite.persona!.company,
              role: testSuite.persona!.role
            },
            results: {
              totalSteps: results.length,
              successfulSteps,
              failedSteps: results.length - successfulSteps,
              stepSuccessRate: `${((successfulSteps / results.length) * 100).toFixed(1)}%`,
              duration: testSuite.totalDuration || 0
            },
            status: testSuite.status
          });
          
        } catch (error: any) {
          console.error(`❌ Sequential test ${testId} failed: ${error.message}`);
          testResults.summary.failedTests++;
        }
      }
    }

    // Phase 3: Run Concurrent Tests
    const remainingTestIds = allTestIds.slice(sequential);
    if (concurrent > 0 && remainingTestIds.length > 0) {
      console.log(`\n⚡ PHASE 3: Running ${Math.min(concurrent, remainingTestIds.length)} Concurrent Tests (Max Concurrency: ${maxConcurrency})`);
      console.log('='.repeat(70));

      const concurrentTestIds = remainingTestIds.slice(0, concurrent);
      
      try {
        const concurrentResults = await testHarness.runConcurrentTests(concurrentTestIds, maxConcurrency);
        
        for (const [testId, results] of Array.from(concurrentResults.entries())) {
          const testSuite = testHarness.getTestSuite(testId)!;
          
          const successfulSteps = results.filter((r: any) => r.success).length;
          const isTestSuccessful = successfulSteps === results.length;
          
          if (isTestSuccessful) {
            testResults.summary.successfulTests++;
          } else {
            testResults.summary.failedTests++;
          }
          
          testResults.tests.push({
            testId,
            testName: testSuite.name,
            persona: {
              name: testSuite.persona!.name,
              email: testSuite.persona!.email,
              company: testSuite.persona!.company,
              role: testSuite.persona!.role
            },
            results: {
              totalSteps: results.length,
              successfulSteps,
              failedSteps: results.length - successfulSteps,
              stepSuccessRate: `${((successfulSteps / results.length) * 100).toFixed(1)}%`,
              duration: testSuite.totalDuration || 0
            },
            status: testSuite.status
          });
        }
        
      } catch (error: any) {
        console.error(`❌ Concurrent tests failed: ${error.message}`);
        testResults.summary.failedTests += concurrentTestIds.length;
      }
    }

    // Calculate final statistics
    const endTime = Date.now();
    testResults.summary.totalDuration = endTime - startTime;
    testResults.summary.avgDurationPerTest = Math.round(testResults.summary.totalDuration / testResults.tests.length);
    testResults.summary.successRate = `${((testResults.summary.successfulTests / testResults.tests.length) * 100).toFixed(1)}%`;

    // Print comprehensive summary
    printComprehensiveSummary(testResults);

    // Clean up
    testHarness.cleanup();

  } catch (error: any) {
    console.error(`❌ Comprehensive test execution failed: ${error.message}`);
    throw error;
  }

  return testResults;
}

/**
 * Print comprehensive test summary
 */
function printComprehensiveSummary(results: ComprehensiveTestResults): void {
  console.log(`\n\n🎉 MARVEL COMPREHENSIVE TEST SUMMARY`);
  console.log('='.repeat(80));
  
  console.log(`📊 OVERALL RESULTS:`);
  console.log(`Total Tests Run: ${results.summary.totalTests}`);
  console.log(`Successful Tests: ${results.summary.successfulTests}`);
  console.log(`Failed Tests: ${results.summary.failedTests}`);
  console.log(`Success Rate: ${results.summary.successRate}`);
  console.log(`Total Duration: ${(results.summary.totalDuration / 1000).toFixed(2)}s`);
  console.log(`Avg Duration per Test: ${(results.summary.avgDurationPerTest / 1000).toFixed(2)}s`);
  
  console.log(`\n👥 PERSONA STATISTICS:`);
  console.log(`Total Personas Generated: ${results.personaStats.totalGenerated}`);
  console.log(`Unique Emails Created: ${results.personaStats.uniqueEmails}`);
  console.log(`Duplicates Blocked: ${results.personaStats.duplicatesBlocked}`);
  
  console.log(`\n📋 INDIVIDUAL TEST RESULTS:`);
  
  // Group by success/failure for easier reading
  const successfulTests = results.tests.filter(t => t.status === 'completed' && t.results.failedSteps === 0);
  const failedTests = results.tests.filter(t => t.status !== 'completed' || t.results.failedSteps > 0);
  
  if (successfulTests.length > 0) {
    console.log(`\n✅ SUCCESSFUL TESTS (${successfulTests.length}):`);
    successfulTests.forEach((test, index) => {
      console.log(`${index + 1}. ${test.testName}`);
      console.log(`   Persona: ${test.persona.name} (${test.persona.email})`);
      console.log(`   Steps: ${test.results.successfulSteps}/${test.results.totalSteps} successful (${test.results.stepSuccessRate})`);
      console.log(`   Duration: ${(test.results.duration / 1000).toFixed(2)}s`);
    });
  }
  
  if (failedTests.length > 0) {
    console.log(`\n❌ FAILED TESTS (${failedTests.length}):`);
    failedTests.forEach((test, index) => {
      console.log(`${index + 1}. ${test.testName} - ${test.status}`);
      console.log(`   Persona: ${test.persona.name} (${test.persona.email})`);
      console.log(`   Steps: ${test.results.successfulSteps}/${test.results.totalSteps} successful (${test.results.stepSuccessRate})`);
      console.log(`   Failed Steps: ${test.results.failedSteps}`);
      console.log(`   Duration: ${(test.results.duration / 1000).toFixed(2)}s`);
    });
  }
  
  console.log(`\n🎯 RECOMMENDATIONS:`);
  if (results.summary.successRate === '100.0%') {
    console.log('🎊 Perfect! All tests passed. The persona registry is working flawlessly.');
  } else if (parseFloat(results.summary.successRate) >= 80) {
    console.log('👍 Good results! Most tests passed. Check failed tests for patterns.');
  } else {
    console.log('⚠️  Some tests failed. Review the errors and consider adjusting test parameters.');
  }
  
  if (results.personaStats.duplicatesBlocked > 0) {
    console.log(`🛡️  Persona registry blocked ${results.personaStats.duplicatesBlocked} duplicates, preventing API conflicts.`);
  }
  
  console.log('\n✨ Test completed successfully with comprehensive persona management!');
}