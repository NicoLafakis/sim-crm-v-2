/**
 * Comprehensive Test Harness for HubSpot CRM Integration
 * Features: unique persona generation, association validation, concurrent testing
 */

import { personaRegistry, generateUniquePersona, PersonaRecord, TestConfig, validateHubSpotProperty, isPersonaRegistryEnabled } from './persona-registry';
import { DatabaseStorage } from "../storage";
import { makeHubSpotRequest, createAssociationsV4Batch } from '../orchestrator';

const storage = new DatabaseStorage();

export interface TestStep {
  id: string;
  stepIndex: number;
  action: 'create_contact' | 'create_company' | 'create_deal' | 'create_ticket' | 'create_note' | 'associate' | 'wait';
  recordType?: string;
  waitTime?: number; // seconds
  associationTarget?: string;
  associationType?: number;
  expectedStatusCode: number;
}

export interface TestResult {
  success: boolean;
  step: string;
  stepIndex: number;
  recordId?: string;
  error?: string;
  statusCode?: number;
  timestamp: string;
  duration: number; // ms
  hubspotId?: string;
}

export interface TestSuite {
  id: string;
  name: string;
  config: TestConfig;
  steps: TestStep[];
  persona?: PersonaRecord;
  results: TestResult[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  totalDuration?: number;
}

export class TestHarness {
  private testSuites: Map<string, TestSuite> = new Map();
  private hubspotToken: string;
  private recordIds: Map<string, string> = new Map(); // testId -> recordId mapping

  constructor(hubspotToken: string) {
    this.hubspotToken = hubspotToken;
  }

  /**
   * Create a new test suite with persona generation
   */
  async createTestSuite(name: string, config: TestConfig, steps: TestStep[]): Promise<string> {
    if (!isPersonaRegistryEnabled()) {
      throw new Error('Persona Registry is not enabled. Set PERSONA_REGISTRY_ENABLED=true');
    }

    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate unique persona for this test
    const persona = await generateUniquePersona(config);
    
    const testSuite: TestSuite = {
      id: testId,
      name,
      config,
      steps,
      persona,
      results: [],
      status: 'pending'
    };

    this.testSuites.set(testId, testSuite);
    console.log(`✅ Created test suite: ${name} with persona: ${persona.name} (${persona.email})`);
    
    return testId;
  }

  /**
   * Run a single test suite
   */
  async runTestSuite(testId: string): Promise<TestResult[]> {
    const testSuite = this.testSuites.get(testId);
    if (!testSuite) {
      throw new Error(`Test suite ${testId} not found`);
    }

    console.log(`🚀 Running test suite: ${testSuite.name}`);
    testSuite.status = 'running';
    testSuite.startedAt = new Date();

    try {
      for (let i = 0; i < testSuite.steps.length; i++) {
        const step = testSuite.steps[i];
        const startTime = Date.now();
        
        console.log(`\n📋 Step ${step.stepIndex}: ${step.action}`);
        
        try {
          const result = await this.executeTestStep(testId, step);
          result.stepIndex = step.stepIndex;
          result.duration = Date.now() - startTime;
          
          testSuite.results.push(result);
          
          const emoji = result.success ? '✅' : '❌';
          const details = result.recordId ? ` (ID: ${result.recordId})` : '';
          console.log(`${emoji} ${result.step}${details}`);
          
          // Stop on failure if critical step
          if (!result.success && this.isCriticalStep(step)) {
            console.log(`🛑 Critical step failed, stopping test suite`);
            break;
          }
          
        } catch (error: any) {
          const result: TestResult = {
            success: false,
            step: step.action,
            stepIndex: step.stepIndex,
            error: error.message,
            statusCode: 500,
            timestamp: new Date().toISOString(),
            duration: Date.now() - startTime
          };
          
          testSuite.results.push(result);
          console.log(`❌ ${step.action} - ${error.message}`);
        }
      }
      
      testSuite.status = 'completed';
      
    } catch (error: any) {
      testSuite.status = 'failed';
      console.error(`❌ Test suite failed: ${error.message}`);
      
    } finally {
      testSuite.completedAt = new Date();
      testSuite.totalDuration = testSuite.completedAt.getTime() - testSuite.startedAt!.getTime();
      
      // Unlock persona
      if (testSuite.persona) {
        await personaRegistry.unlock(testSuite.persona.id, testId);
      }
    }

    this.printTestSummary(testId);
    return testSuite.results;
  }

  /**
   * Run multiple test suites concurrently
   */
  async runConcurrentTests(testIds: string[], maxConcurrency: number = 5): Promise<Map<string, TestResult[]>> {
    console.log(`🚀 Running ${testIds.length} test suites with max concurrency: ${maxConcurrency}`);
    
    const results = new Map<string, TestResult[]>();
    const batches = this.chunkArray(testIds, maxConcurrency);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n📦 Running batch ${batchIndex + 1}/${batches.length} (${batch.length} tests)`);
      
      const promises = batch.map(testId => 
        this.runTestSuite(testId)
          .then(result => ({ testId, result }))
          .catch(error => ({ testId, error }))
      );
      
      const batchResults = await Promise.all(promises);
      
      for (const batchResult of batchResults) {
        if ('result' in batchResult) {
          results.set(batchResult.testId, batchResult.result);
        } else {
          console.error(`❌ Test ${batchResult.testId} failed:`, batchResult.error);
        }
      }
    }
    
    console.log(`\n🎉 Completed ${testIds.length} test suites`);
    return results;
  }

  /**
   * Execute individual test step
   */
  private async executeTestStep(testId: string, step: TestStep): Promise<TestResult> {
    const testSuite = this.testSuites.get(testId)!;
    const persona = testSuite.persona!;
    
    switch (step.action) {
      case 'create_contact':
        return await this.createContact(testId, persona);
        
      case 'create_company':
        return await this.createCompany(testId, persona);
        
      case 'create_deal':
        return await this.createDeal(testId, persona);
        
      case 'create_ticket':
        return await this.createTicket(testId, persona);
        
      case 'create_note':
        return await this.createNote(testId, persona, step.associationTarget);
        
      case 'associate':
        return await this.createAssociation(testId, step);
        
      case 'wait':
        return await this.wait(step.waitTime || 1);
        
      default:
        throw new Error(`Unknown test step action: ${step.action}`);
    }
  }

  /**
   * Create contact with persona data
   */
  private async createContact(testId: string, persona: PersonaRecord): Promise<TestResult> {
    const contactData = {
      email: validateHubSpotProperty('email', persona.email, 'string'),
      firstname: validateHubSpotProperty('firstname', persona.name.split(' ')[0], 'string'),
      lastname: validateHubSpotProperty('lastname', persona.name.split(' ').slice(1).join(' '), 'string'),
      jobtitle: validateHubSpotProperty('jobtitle', persona.role, 'string'),
      lifecyclestage: 'lead'
    };

    try {
      const response = await makeHubSpotRequest('POST', '/crm/v3/objects/contacts', {
        properties: contactData
      }, this.hubspotToken);

      // Store record ID for later use
      this.recordIds.set(`${testId}_contact`, response.id);
      
      // Update persona with HubSpot ID
      persona.hubspotContactId = response.id;

      return {
        success: true,
        step: 'Create Contact',
        stepIndex: 0,
        recordId: response.id,
        hubspotId: response.id,
        statusCode: 201,
        timestamp: new Date().toISOString(),
        duration: 0
      };
      
    } catch (error: any) {
      return {
        success: false,
        step: 'Create Contact',
        stepIndex: 0,
        error: error.message,
        statusCode: error.statusCode || 500,
        timestamp: new Date().toISOString(),
        duration: 0
      };
    }
  }

  /**
   * Create company with persona data
   */
  private async createCompany(testId: string, persona: PersonaRecord): Promise<TestResult> {
    const companyData = {
      name: validateHubSpotProperty('name', persona.company, 'string'),
      domain: validateHubSpotProperty('domain', persona.domain, 'string'),
      industry: validateHubSpotProperty('industry', this.mapIndustryToHubSpot(persona.industry), 'enumeration'),
      city: 'New York',
      state: 'NY',
      country: 'United States'
    };

    try {
      const response = await makeHubSpotRequest('POST', '/crm/v3/objects/companies', {
        properties: companyData
      }, this.hubspotToken);

      // Store record ID for later use
      this.recordIds.set(`${testId}_company`, response.id);
      
      // Update persona with HubSpot ID
      persona.hubspotCompanyId = response.id;

      return {
        success: true,
        step: 'Create Company',
        stepIndex: 0,
        recordId: response.id,
        hubspotId: response.id,
        statusCode: 201,
        timestamp: new Date().toISOString(),
        duration: 0
      };
      
    } catch (error: any) {
      return {
        success: false,
        step: 'Create Company',
        stepIndex: 0,
        error: error.message,
        statusCode: error.statusCode || 500,
        timestamp: new Date().toISOString(),
        duration: 0
      };
    }
  }

  /**
   * Create deal with persona context
   */
  private async createDeal(testId: string, persona: PersonaRecord): Promise<TestResult> {
    const dealData = {
      dealname: validateHubSpotProperty('dealname', `${persona.name} - ${persona.role} Contract`, 'string'),
      pipeline: 'default',
      dealstage: 'appointmentscheduled',
      amount: validateHubSpotProperty('amount', '5000', 'number'),
      dealtype: 'newbusiness',
      closedate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    try {
      const response = await makeHubSpotRequest('POST', '/crm/v3/objects/deals', {
        properties: dealData
      }, this.hubspotToken);

      // Store record ID for later use
      this.recordIds.set(`${testId}_deal`, response.id);

      return {
        success: true,
        step: 'Create Deal',
        stepIndex: 0,
        recordId: response.id,
        hubspotId: response.id,
        statusCode: 201,
        timestamp: new Date().toISOString(),
        duration: 0
      };
      
    } catch (error: any) {
      return {
        success: false,
        step: 'Create Deal',
        stepIndex: 0,
        error: error.message,
        statusCode: error.statusCode || 500,
        timestamp: new Date().toISOString(),
        duration: 0
      };
    }
  }

  /**
   * Create ticket with persona context
   */
  private async createTicket(testId: string, persona: PersonaRecord): Promise<TestResult> {
    const ticketData = {
      subject: validateHubSpotProperty('subject', `${persona.role} Support Request`, 'string'),
      hs_ticket_priority: 'HIGH',
      content: validateHubSpotProperty('content', `Support request from ${persona.name} at ${persona.company}`, 'string')
    };

    try {
      const response = await makeHubSpotRequest('POST', '/crm/v3/objects/tickets', {
        properties: ticketData
      }, this.hubspotToken);

      // Store record ID for later use
      this.recordIds.set(`${testId}_ticket`, response.id);

      return {
        success: true,
        step: 'Create Ticket',
        stepIndex: 0,
        recordId: response.id,
        hubspotId: response.id,
        statusCode: 201,
        timestamp: new Date().toISOString(),
        duration: 0
      };
      
    } catch (error: any) {
      return {
        success: false,
        step: 'Create Ticket',
        stepIndex: 0,
        error: error.message,
        statusCode: error.statusCode || 500,
        timestamp: new Date().toISOString(),
        duration: 0
      };
    }
  }

  /**
   * Create note with association
   */
  private async createNote(testId: string, persona: PersonaRecord, associationTarget?: string): Promise<TestResult> {
    const noteData = {
      hs_note_body: validateHubSpotProperty('hs_note_body', `Test note for ${persona.name} from comprehensive test harness.`, 'string'),
      hs_timestamp: new Date().toISOString()
    };

    // Determine association based on target
    let associations: any[] = [];
    if (associationTarget) {
      const targetId = this.recordIds.get(`${testId}_${associationTarget}`);
      if (targetId) {
        const associationTypeId = this.getAssociationTypeId(associationTarget);
        associations = [{
          to: { id: targetId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId }]
        }];
      }
    }

    try {
      const response = await makeHubSpotRequest('POST', '/crm/v3/objects/notes', {
        properties: noteData,
        associations: associations.length > 0 ? associations : undefined
      }, this.hubspotToken);

      return {
        success: true,
        step: `Create Note (${associationTarget || 'standalone'})`,
        stepIndex: 0,
        recordId: response.id,
        hubspotId: response.id,
        statusCode: 201,
        timestamp: new Date().toISOString(),
        duration: 0
      };
      
    } catch (error: any) {
      return {
        success: false,
        step: `Create Note (${associationTarget || 'standalone'})`,
        stepIndex: 0,
        error: error.message,
        statusCode: error.statusCode || 500,
        timestamp: new Date().toISOString(),
        duration: 0
      };
    }
  }

  /**
   * Create association between records
   */
  private async createAssociation(testId: string, step: TestStep): Promise<TestResult> {
    const sourceId = this.recordIds.get(`${testId}_${step.recordType}`);
    const targetId = this.recordIds.get(`${testId}_${step.associationTarget}`);
    
    if (!sourceId || !targetId) {
      return {
        success: false,
        step: `Associate ${step.recordType} to ${step.associationTarget}`,
        stepIndex: 0,
        error: `Missing record IDs: source=${sourceId}, target=${targetId}`,
        statusCode: 400,
        timestamp: new Date().toISOString(),
        duration: 0
      };
    }

    try {
      await makeHubSpotRequest('PUT', 
        `/crm/v3/objects/${step.recordType}s/${sourceId}/associations/${step.associationTarget}s/${targetId}/${step.associationType}`, 
        null, this.hubspotToken);

      return {
        success: true,
        step: `Associate ${step.recordType} to ${step.associationTarget}`,
        stepIndex: 0,
        statusCode: 200,
        timestamp: new Date().toISOString(),
        duration: 0
      };
      
    } catch (error: any) {
      return {
        success: false,
        step: `Associate ${step.recordType} to ${step.associationTarget}`,
        stepIndex: 0,
        error: error.message,
        statusCode: error.statusCode || 500,
        timestamp: new Date().toISOString(),
        duration: 0
      };
    }
  }

  /**
   * Wait for specified time
   */
  private async wait(seconds: number): Promise<TestResult> {
    console.log(`⏳ Waiting ${seconds} seconds...`);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    
    return {
      success: true,
      step: `Wait ${seconds}s`,
      stepIndex: 0,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      duration: seconds * 1000
    };
  }

  /**
   * Helper methods
   */
  private isCriticalStep(step: TestStep): boolean {
    return ['create_contact', 'create_company'].includes(step.action);
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private mapIndustryToHubSpot(industry: string): string {
    const industryMap: { [key: string]: string } = {
      'Media & Publishing': 'MEDIA_AND_INTERNET',
      'Technology': 'COMPUTER_HARDWARE',
      'Healthcare': 'HEALTH_CARE_SERVICES',
      'Finance': 'FINANCIAL_SERVICES',
      'E-commerce': 'RETAIL',
      'Manufacturing': 'MANUFACTURING'
    };
    
    return industryMap[industry] || 'OTHER';
  }

  private getAssociationTypeId(objectType: string): number {
    const associationMap: { [key: string]: number } = {
      'contact': 202,
      'company': 280,
      'deal': 214,
      'ticket': 218
    };
    
    return associationMap[objectType] || 202;
  }

  /**
   * Print test summary
   */
  private printTestSummary(testId: string): void {
    const testSuite = this.testSuites.get(testId)!;
    const results = testSuite.results;
    
    console.log(`\n📊 TEST SUMMARY - ${testSuite.name}`);
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    
    console.log(`Persona: ${testSuite.persona?.name} (${testSuite.persona?.email})`);
    console.log(`Total Steps: ${total}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${total - successful}`);
    console.log(`Success Rate: ${((successful / total) * 100).toFixed(1)}%`);
    console.log(`Total Duration: ${testSuite.totalDuration}ms`);
    
    console.log('\n📋 DETAILED RESULTS:');
    results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const details = result.recordId ? ` | ID: ${result.recordId}` : '';
      const error = result.error ? ` | Error: ${result.error}` : '';
      console.log(`${index + 1}. ${status} | ${result.step}${details}${error}`);
    });
  }

  /**
   * Get test suite results
   */
  getTestSuite(testId: string): TestSuite | undefined {
    return this.testSuites.get(testId);
  }

  /**
   * Clean up completed test suites
   */
  cleanup(): void {
    for (const [testId, testSuite] of Array.from(this.testSuites.entries())) {
      if (testSuite.status === 'completed' || testSuite.status === 'failed') {
        this.testSuites.delete(testId);
      }
    }
  }
}

/**
 * Predefined test sequences
 */
export const MARVEL_TEST_SEQUENCE: TestStep[] = [
  { id: 'step_1', stepIndex: 1, action: 'create_contact', expectedStatusCode: 201 },
  { id: 'step_2', stepIndex: 2, action: 'wait', waitTime: 5, expectedStatusCode: 200 },
  { id: 'step_3', stepIndex: 3, action: 'create_company', expectedStatusCode: 201 },
  { id: 'step_4', stepIndex: 4, action: 'associate', recordType: 'contact', associationTarget: 'company', associationType: 1, expectedStatusCode: 200 },
  { id: 'step_5', stepIndex: 5, action: 'wait', waitTime: 10, expectedStatusCode: 200 },
  { id: 'step_6', stepIndex: 6, action: 'create_deal', expectedStatusCode: 201 },
  { id: 'step_7', stepIndex: 7, action: 'associate', recordType: 'deal', associationTarget: 'contact', associationType: 3, expectedStatusCode: 200 },
  { id: 'step_8', stepIndex: 8, action: 'associate', recordType: 'deal', associationTarget: 'company', associationType: 5, expectedStatusCode: 200 },
  { id: 'step_9', stepIndex: 9, action: 'wait', waitTime: 10, expectedStatusCode: 200 },
  { id: 'step_10', stepIndex: 10, action: 'create_ticket', expectedStatusCode: 201 },
  { id: 'step_11', stepIndex: 11, action: 'associate', recordType: 'ticket', associationTarget: 'contact', associationType: 16, expectedStatusCode: 200 },
  { id: 'step_12', stepIndex: 12, action: 'wait', waitTime: 5, expectedStatusCode: 200 },
  { id: 'step_13', stepIndex: 13, action: 'create_note', associationTarget: 'contact', expectedStatusCode: 201 },
  { id: 'step_14', stepIndex: 14, action: 'wait', waitTime: 5, expectedStatusCode: 200 },
  { id: 'step_15', stepIndex: 15, action: 'create_note', associationTarget: 'deal', expectedStatusCode: 201 }
];