/**
 * Marvel Theme Record Creation Test
 * Tests the complete record creation and association flow with proper timing
 */

import { DatabaseStorage } from "./storage";
import { 
  executeCreateContact, 
  executeCreateCompany, 
  executeCreateDeal,
  executeCreateTicket,
  executeCreateNote,
  makeHubSpotRequest
} from './orchestrator';

const storage = new DatabaseStorage();

interface TestResult {
  success: boolean;
  step: string;
  recordId?: string;
  error?: string;
  statusCode?: number;
  timestamp: string;
}

class MarvelSequenceTest {
  private results: TestResult[] = [];
  private recordIds: Record<string, string> = {};
  private hubspotToken: string;

  constructor(hubspotToken: string) {
    this.hubspotToken = hubspotToken;
  }

  private async wait(seconds: number): Promise<void> {
    console.log(`⏳ Waiting ${seconds} seconds...`);
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  private logResult(step: string, success: boolean, recordId?: string, error?: string): void {
    const result: TestResult = {
      success,
      step,
      recordId,
      error,
      statusCode: success ? 200 : 400,
      timestamp: new Date().toISOString()
    };
    this.results.push(result);
    
    const emoji = success ? '✅' : '❌';
    const message = recordId ? ` (ID: ${recordId})` : '';
    const errorMsg = error ? ` - ${error}` : '';
    console.log(`${emoji} ${step}${message}${errorMsg}`);
  }

  async runTest(): Promise<TestResult[]> {
    console.log('🎬 Starting Marvel Theme Record Creation Test...\n');

    try {
      // Step 1: Create Contact
      console.log('1️⃣ Creating Marvel contact...');
      const contactData = {
        email: 'peter.parker@marveluniverse.com',
        firstname: 'Peter',
        lastname: 'Parker',
        phone: '+1-555-SPIDER',
        jobtitle: 'Friendly Neighborhood Spider-Man',
        lifecyclestage: 'lead'
      };

      const contactResult = await executeCreateContact(contactData, this.hubspotToken);

      if (contactResult.success) {
        this.recordIds.contactId = contactResult.recordId;
        this.logResult('Create Contact', true, contactResult.recordId);
      } else {
        this.logResult('Create Contact', false, undefined, contactResult.error);
        return this.results;
      }

      // Wait 5 seconds
      await this.wait(5);

      // Step 2: Create Company and Associate to Contact
      console.log('2️⃣ Creating Marvel company and associating to contact...');
      const companyData = {
        name: 'Daily Bugle Media',
        domain: 'dailybugle.com',
        phone: '+1-555-BUGLE',
        city: 'New York',
        state: 'NY',
        country: 'United States',
        website: 'https://dailybugle.com',
        industry: 'Media & Publishing'
      };

      const companyResult = await executeCreateCompany(companyData, this.hubspotToken);

      if (companyResult.success) {
        this.recordIds.companyId = companyResult.recordId;
        this.logResult('Create Company', true, companyResult.recordId);

        // Associate contact to company using direct HubSpot API
        try {
          await makeHubSpotRequest('PUT', 
            `/crm/v3/objects/contacts/${this.recordIds.contactId}/associations/companies/${this.recordIds.companyId}/1`, 
            null, this.hubspotToken);
          this.logResult('Associate Contact to Company', true);
        } catch (error: any) {
          this.logResult('Associate Contact to Company', false, undefined, error.message);
        }

        if (contactCompanyAssoc.success) {
          this.logResult('Associate Contact to Company', true);
        } else {
          this.logResult('Associate Contact to Company', false, undefined, contactCompanyAssoc.error);
        }
      } else {
        this.logResult('Create Company', false, undefined, companyResult.error);
      }

      // Wait 10 seconds
      await this.wait(10);

      // Step 3: Create Deal and Associate to Contact and Company
      console.log('3️⃣ Creating Marvel deal and associating to contact and company...');
      const dealData = {
        dealname: 'Spider-Man Photo Exclusive Contract',
        pipeline: 'default',
        dealstage: 'appointmentscheduled',
        amount: '5000',
        dealtype: 'New Business',
        closedate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
      };

      const dealResult = await executeCreateDeal(dealData, this.hubspotToken);

      if (dealResult.success) {
        this.recordIds.dealId = dealResult.recordId;
        this.logResult('Create Deal', true, dealResult.recordId);

        // Associate deal to contact and company using direct HubSpot API
        try {
          await makeHubSpotRequest('PUT', 
            `/crm/v3/objects/deals/${this.recordIds.dealId}/associations/contacts/${this.recordIds.contactId}/3`, 
            null, this.hubspotToken);
          await makeHubSpotRequest('PUT', 
            `/crm/v3/objects/deals/${this.recordIds.dealId}/associations/companies/${this.recordIds.companyId}/5`, 
            null, this.hubspotToken);
          this.logResult('Associate Deal to Contact and Company', true);
        } catch (error: any) {
          this.logResult('Associate Deal to Contact and Company', false, undefined, error.message);
        }
      } else {
        this.logResult('Create Deal', false, undefined, dealResult.error);
      }

      // Wait 10 seconds
      await this.wait(10);

      // Step 4: Create Ticket and Associate to Deal
      console.log('4️⃣ Creating Marvel ticket and associating to deal...');
      const ticketData = {
        subject: 'Spider-Man Photo Quality Issues',
        hs_pipeline: 'default',
        hs_pipeline_stage: '1',
        hs_ticket_priority: 'HIGH',
        content: 'The Spider-Man photos are blurry and need better resolution for the front page story.'
      };

      const ticketResult = await executeCreateTicket(ticketData, this.hubspotToken);

      if (ticketResult.success) {
        this.recordIds.ticketId = ticketResult.recordId;
        this.logResult('Create Ticket', true, ticketResult.recordId);

        // Associate ticket to contact using direct HubSpot API
        try {
          await makeHubSpotRequest('PUT', 
            `/crm/v3/objects/tickets/${this.recordIds.ticketId}/associations/contacts/${this.recordIds.contactId}/16`, 
            null, this.hubspotToken);
          this.logResult('Associate Ticket to Contact', true);
        } catch (error: any) {
          this.logResult('Associate Ticket to Contact', false, undefined, error.message);
        }
      } else {
        this.logResult('Create Ticket', false, undefined, ticketResult.error);
      }

      // Wait 5 seconds
      await this.wait(5);

      // Step 5: Create Note Associated to Contact
      console.log('5️⃣ Creating note associated to contact...');
      const contactNoteData = {
        hs_note_body: 'Met with Peter Parker to discuss his photography skills. Very promising talent with unique angles and exclusive access to Spider-Man activities.',
        hs_timestamp: new Date().toISOString()
      };

      const contactNoteResult = await executeCreateNote(contactNoteData, this.hubspotToken);

      if (contactNoteResult.success) {
        this.recordIds.contactNoteId = contactNoteResult.recordId;
        this.logResult('Create Note (Contact)', true, contactNoteResult.recordId);
      } else {
        this.logResult('Create Note (Contact)', false, undefined, contactNoteResult.error);
      }

      // Wait 5 seconds
      await this.wait(5);

      // Step 6: Create Note Associated to Deal
      console.log('6️⃣ Creating note associated to deal...');
      const dealNoteData = {
        hs_note_body: 'Negotiated exclusive photo contract for Spider-Man coverage. Peter Parker will provide high-quality action shots for premium pricing.',
        hs_timestamp: new Date().toISOString()
      };

      const dealNoteResult = await executeCreateNote(dealNoteData, this.hubspotToken);

      if (dealNoteResult.success) {
        this.recordIds.dealNoteId = dealNoteResult.recordId;
        this.logResult('Create Note (Deal)', true, dealNoteResult.recordId);
      } else {
        this.logResult('Create Note (Deal)', false, undefined, dealNoteResult.error);
      }

    } catch (error: any) {
      this.logResult('Test Execution', false, undefined, error.message);
    }

    return this.results;
  }

  printSummary(): void {
    console.log('\n📊 TEST SUMMARY');
    console.log('='.repeat(50));
    
    const successful = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    console.log(`Total Steps: ${total}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${total - successful}`);
    console.log(`Success Rate: ${((successful / total) * 100).toFixed(1)}%`);
    
    console.log('\n📋 DETAILED RESULTS:');
    this.results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const details = result.recordId ? ` | ID: ${result.recordId}` : '';
      const error = result.error ? ` | Error: ${result.error}` : '';
      console.log(`${index + 1}. ${status} | ${result.step}${details}${error}`);
    });

    console.log('\n🆔 RECORD IDs CREATED:');
    Object.entries(this.recordIds).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
  }
}

export async function runMarvelSequenceTest(): Promise<TestResult[]> {
  try {
    // Get user's HubSpot token
    const session = await storage.getSession(1); // Assuming user ID 1
    if (!session?.hubspotToken) {
      throw new Error('HubSpot token not found. Please connect your HubSpot account first.');
    }

    const test = new MarvelSequenceTest(session.hubspotToken);
    const results = await test.runTest();
    test.printSummary();
    
    return results;
  } catch (error: any) {
    console.error('❌ Marvel test error:', error.message);
    return [{
      success: false,
      step: 'Test Execution',
      error: error.message,
      timestamp: new Date().toISOString()
    }];
  }
}