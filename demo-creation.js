// Demo script to create contact, company, and deal with associations
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function createDemo() {
  console.log('🚀 Starting Demo: Creating Contact, Company, and Deal with Associations');
  
  try {
    // 1. Create Contact
    console.log('\n1. Creating Contact...');
    const contactData = {
      firstName: "Emma",
      lastName: "Rodriguez", 
      email: "emma.rodriguez@innovatetech.com",
      phone: "+1-555-321-9876",
      jobTitle: "Head of Digital Transformation",
      company: "InnovateTech Solutions"
    };
    
    // 2. Create Company  
    console.log('\n2. Creating Company...');
    const companyData = {
      name: "InnovateTech Solutions",
      domain: "innovatetech.com",
      city: "Denver", 
      state: "Colorado",
      industry: "Software",
      numberofemployees: 150
    };
    
    // 3. Create Deal
    console.log('\n3. Creating Deal...');
    const dealData = {
      dealname: "Digital Transformation Consulting - Phase 1",
      amount: 250000,
      dealstage: "appointmentscheduled", 
      pipeline: "default"
    };
    
    console.log('\n✅ Demo Data Prepared');
    console.log('Contact:', JSON.stringify(contactData, null, 2));
    console.log('Company:', JSON.stringify(companyData, null, 2));
    console.log('Deal:', JSON.stringify(dealData, null, 2));
    
  } catch (error) {
    console.error('❌ Demo Error:', error.message);
  }
}

createDemo();