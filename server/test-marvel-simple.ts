/**
 * Simplified Marvel Theme Test using direct HubSpot API calls
 */

import { DatabaseStorage } from "./storage";
import { makeHubSpotRequest } from './orchestrator';

const storage = new DatabaseStorage();

interface TestResult {
  success: boolean;
  step: string;
  recordId?: string;
  error?: string;
  statusCode?: number;
  timestamp: string;
}

export async function runSimpleMarvelTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const recordIds: Record<string, string> = {};

  try {
    // Get user's HubSpot token
    const session = await storage.getSession(1);
    if (!session?.hubspotToken) {
      throw new Error('HubSpot token not found. Please connect your HubSpot account first.');
    }

    const token = session.hubspotToken;

    // Helper function to log results
    const logResult = (step: string, success: boolean, recordId?: string, error?: string): void => {
      const result: TestResult = {
        success,
        step,
        recordId,
        error,
        statusCode: success ? 200 : 400,
        timestamp: new Date().toISOString()
      };
      results.push(result);
      
      const emoji = success ? '✅' : '❌';
      const message = recordId ? ` (ID: ${recordId})` : '';
      const errorMsg = error ? ` - ${error}` : '';
      console.log(`${emoji} ${step}${message}${errorMsg}`);
    };

    const wait = (seconds: number): Promise<void> => {
      console.log(`⏳ Waiting ${seconds} seconds...`);
      return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    };

    console.log('🎬 Starting Simple Marvel Theme Test...\n');

    // Step 1: Create Contact
    console.log('1️⃣ Creating Marvel contact...');
    try {
      const contactData = {
        email: 'peter.parker@marvel-test.com',
        firstname: 'Peter',
        lastname: 'Parker',
        phone: '+1-555-SPIDER',
        jobtitle: 'Friendly Neighborhood Spider-Man',
        lifecyclestage: 'lead'
      };

      const contactResponse = await makeHubSpotRequest('POST', '/crm/v3/objects/contacts', {
        properties: contactData
      }, token);

      recordIds.contactId = contactResponse.id;
      logResult('Create Contact', true, contactResponse.id);
    } catch (error: any) {
      logResult('Create Contact', false, undefined, error.message);
      return results;
    }

    // Wait 5 seconds
    await wait(5);

    // Step 2: Create Company
    console.log('2️⃣ Creating Marvel company...');
    try {
      const companyData = {
        name: 'Daily Bugle Media - Test',
        domain: 'dailybugle-test.com',
        phone: '+1-555-BUGLE',
        city: 'New York',
        state: 'NY',
        country: 'United States',
        website: 'https://dailybugle-test.com',
        industry: 'MEDIA_AND_INTERNET'
      };

      const companyResponse = await makeHubSpotRequest('POST', '/crm/v3/objects/companies', {
        properties: companyData
      }, token);

      recordIds.companyId = companyResponse.id;
      logResult('Create Company', true, companyResponse.id);

      // Associate contact to company
      try {
        await makeHubSpotRequest('PUT', 
          `/crm/v3/objects/contacts/${recordIds.contactId}/associations/companies/${recordIds.companyId}/1`, 
          null, token);
        logResult('Associate Contact to Company', true);
      } catch (error: any) {
        logResult('Associate Contact to Company', false, undefined, error.message);
      }

    } catch (error: any) {
      logResult('Create Company', false, undefined, error.message);
    }

    // Wait 10 seconds
    await wait(10);

    // Step 3: Create Deal
    console.log('3️⃣ Creating Marvel deal...');
    try {
      const dealData = {
        dealname: 'Spider-Man Photo Exclusive Contract - Test',
        pipeline: 'default',
        dealstage: 'appointmentscheduled',
        amount: '5000',
        dealtype: 'newbusiness',
        closedate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      const dealResponse = await makeHubSpotRequest('POST', '/crm/v3/objects/deals', {
        properties: dealData
      }, token);

      recordIds.dealId = dealResponse.id;
      logResult('Create Deal', true, dealResponse.id);

      // Associate deal to contact and company
      try {
        await makeHubSpotRequest('PUT', 
          `/crm/v3/objects/deals/${recordIds.dealId}/associations/contacts/${recordIds.contactId}/3`, 
          null, token);
        await makeHubSpotRequest('PUT', 
          `/crm/v3/objects/deals/${recordIds.dealId}/associations/companies/${recordIds.companyId}/5`, 
          null, token);
        logResult('Associate Deal to Contact and Company', true);
      } catch (error: any) {
        logResult('Associate Deal to Contact and Company', false, undefined, error.message);
      }

    } catch (error: any) {
      logResult('Create Deal', false, undefined, error.message);
    }

    // Wait 10 seconds
    await wait(10);

    // Step 4: Create Ticket
    console.log('4️⃣ Creating Marvel ticket...');
    try {
      const ticketData = {
        subject: 'Spider-Man Photo Quality Issues - Test',
        hs_ticket_priority: 'HIGH',
        content: 'The Spider-Man photos are blurry and need better resolution for the front page story.'
      };

      const ticketResponse = await makeHubSpotRequest('POST', '/crm/v3/objects/tickets', {
        properties: ticketData
      }, token);

      recordIds.ticketId = ticketResponse.id;
      logResult('Create Ticket', true, ticketResponse.id);

      // Associate ticket to contact
      try {
        await makeHubSpotRequest('PUT', 
          `/crm/v3/objects/tickets/${recordIds.ticketId}/associations/contacts/${recordIds.contactId}/16`, 
          null, token);
        logResult('Associate Ticket to Contact', true);
      } catch (error: any) {
        logResult('Associate Ticket to Contact', false, undefined, error.message);
      }

    } catch (error: any) {
      logResult('Create Ticket', false, undefined, error.message);
    }

    // Wait 5 seconds
    await wait(5);

    // Step 5: Create Note Associated to Contact
    console.log('5️⃣ Creating note associated to contact...');
    try {
      const contactNoteData = {
        hs_note_body: 'Met with Peter Parker to discuss his photography skills. Very promising talent with unique angles and exclusive access to Spider-Man activities.',
        hs_timestamp: new Date().toISOString()
      };

      const contactNoteResponse = await makeHubSpotRequest('POST', '/crm/v3/objects/notes', {
        properties: contactNoteData,
        associations: [{
          to: { id: recordIds.contactId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }]
        }]
      }, token);

      recordIds.contactNoteId = contactNoteResponse.id;
      logResult('Create Note (Contact)', true, contactNoteResponse.id);
    } catch (error: any) {
      logResult('Create Note (Contact)', false, undefined, error.message);
    }

    // Wait 5 seconds
    await wait(5);

    // Step 6: Create Note Associated to Deal
    console.log('6️⃣ Creating note associated to deal...');
    try {
      const dealNoteData = {
        hs_note_body: 'Negotiated exclusive photo contract for Spider-Man coverage. Peter Parker will provide high-quality action shots for premium pricing.',
        hs_timestamp: new Date().toISOString()
      };

      const dealNoteResponse = await makeHubSpotRequest('POST', '/crm/v3/objects/notes', {
        properties: dealNoteData,
        associations: [{
          to: { id: recordIds.dealId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }]
        }]
      }, token);

      recordIds.dealNoteId = dealNoteResponse.id;
      logResult('Create Note (Deal)', true, dealNoteResponse.id);
    } catch (error: any) {
      logResult('Create Note (Deal)', false, undefined, error.message);
    }

    console.log('\n📊 TEST SUMMARY');
    console.log('='.repeat(50));
    
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    
    console.log(`Total Steps: ${total}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${total - successful}`);
    console.log(`Success Rate: ${((successful / total) * 100).toFixed(1)}%`);
    
    console.log('\n🆔 RECORD IDs CREATED:');
    Object.entries(recordIds).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });

  } catch (error: any) {
    results.push({
      success: false,
      step: 'Test Execution',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }

  return results;
}