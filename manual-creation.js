const { makeHubSpotRequest, createAssociations } = require('./server/hubspot-service');
const { generateRealisticData } = require('./server/orchestrator');

async function createRecordsManually() {
  const userId = 1;
  const token = process.env.HUBSPOT_ACCESS_TOKEN || await getTokenForUser(userId);
  
  console.log('Creating Contact, Company, and Deal manually...');
  
  try {
    // 1. Create Contact
    console.log('\n1. Creating Contact...');
    const contactData = {
      firstname: "Marcus",
      lastname: "Chen",
      email: "marcus.chen@quantumtech.io",
      phone: "+1-555-987-6543",
      jobtitle: "VP of Engineering",
      company: "QuantumTech Innovations"
    };
    
    const contactResponse = await makeHubSpotRequest('POST', '/crm/v3/objects/contacts', {
      properties: contactData
    }, token);
    console.log('✅ Contact Created - ID:', contactResponse.id);
    
    // 2. Create Company
    console.log('\n2. Creating Company...');
    const companyData = {
      name: "QuantumTech Innovations",
      domain: "quantumtech.io",
      city: "Austin",
      state: "Texas", 
      industry: "Software",
      numberofemployees: 275
    };
    
    const companyResponse = await makeHubSpotRequest('POST', '/crm/v3/objects/companies', {
      properties: companyData
    }, token);
    console.log('✅ Company Created - ID:', companyResponse.id);
    
    // 3. Create Deal
    console.log('\n3. Creating Deal...');
    const dealData = {
      dealname: "Quantum Computing Platform - Enterprise License",
      amount: 750000,
      dealstage: "appointmentscheduled",
      pipeline: "default"
    };
    
    const dealResponse = await makeHubSpotRequest('POST', '/crm/v3/objects/deals', {
      properties: dealData
    }, token);
    console.log('✅ Deal Created - ID:', dealResponse.id);
    
    // 4. Create Associations
    console.log('\n4. Creating Associations...');
    
    // Associate Deal -> Contact
    await createAssociations(dealResponse.id, 'deals', {
      contact: contactResponse.id
    }, token);
    
    // Associate Deal -> Company  
    await createAssociations(dealResponse.id, 'deals', {
      company: companyResponse.id
    }, token);
    
    console.log('✅ All Associations Created Successfully');
    
    console.log('\n🎉 Manual Creation Complete!');
    console.log(`Contact: ${contactResponse.id} (${contactData.firstname} ${contactData.lastname})`);
    console.log(`Company: ${companyResponse.id} (${companyData.name})`);
    console.log(`Deal: ${dealResponse.id} (${dealData.dealname})`);
    
    return {
      contact: contactResponse,
      company: companyResponse,
      deal: dealResponse
    };
    
  } catch (error) {
    console.error('❌ Manual Creation Error:', error.message);
    throw error;
  }
}

async function getTokenForUser(userId) {
  const { db } = require('./server/db');
  const { apiTokens } = require('./shared/schema');
  const { eq } = require('drizzle-orm');
  
  const token = await db.select().from(apiTokens).where(eq(apiTokens.userId, userId)).limit(1);
  if (!token[0]) throw new Error('No HubSpot token found for user');
  return token[0].token;
}

module.exports = { createRecordsManually };

// Run if called directly
if (require.main === module) {
  createRecordsManually().catch(console.error);
}