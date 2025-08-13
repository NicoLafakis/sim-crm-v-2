# Owner Assignment System Test Guide

This document explains how to test the newly implemented owner assignment system for Contact, Company, and Deal records.

## What Was Implemented

1. **Database Table**: Added `hubspot_owners` table to cache HubSpot owner data per user integration
2. **Owner Caching System**: `fetchAndCacheOwners()` automatically retrieves and stores owner data from HubSpot API
3. **Storage Interface Extensions**: Added cacheHubspotOwners(), getHubspotOwners() methods
4. **Owner Resolution Function**: `resolveOwnerEmail()` resolves owner emails to HubSpot owner IDs
5. **Email-to-ID Resolution**: Support for email-based owner assignment in CSV templates
6. **Graceful Failure**: Missing owner emails leave records unassigned without causing failures
7. **CRM Integration**: Enhanced Contact, Company, and Deal creation operations with owner assignment

## Test Scenarios

### Test 1: Owner Resolution with Valid Email
```bash
curl -X POST http://localhost:5000/api/test/owner-assignment \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "recordData": {
      "firstname": "John",
      "lastname": "Doe",
      "email": "john.doe@example.com",
      "owner": "sales@yourcompany.com"
    },
    "objectType": "contact"
  }'
```

Expected: `hasOwnerAssignment: true` with resolved HubSpot owner ID

### Test 2: Owner Resolution with Invalid Email
```bash
curl -X POST http://localhost:5000/api/test/owner-assignment \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "recordData": {
      "firstname": "Jane",
      "lastname": "Smith",
      "email": "jane.smith@example.com",
      "owner_email": "nonexistent@company.com"
    },
    "objectType": "contact"
  }'
```

Expected: `hasOwnerAssignment: false` with graceful message about unassigned owner

### Test 3: Record Without Owner Assignment
```bash
curl -X POST http://localhost:5000/api/test/owner-assignment \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "recordData": {
      "name": "Acme Corp",
      "domain": "acme.com",
      "industry": "Technology"
    },
    "objectType": "company"
  }'
```

Expected: `hasOwnerAssignment: false` with "No owner assignment needed" message

### Test 4: Multiple Owner Field Formats
```bash
curl -X POST http://localhost:5000/api/test/owner-assignment \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "recordData": {
      "dealname": "Big Sale",
      "amount": "50000",
      "dealstage": "Appointment Scheduled",
      "ownerEmail": "sales@yourcompany.com"
    },
    "objectType": "deal"
  }'
```

Expected: System should recognize `ownerEmail` field and resolve to owner ID

### Test 5: View Cached Owners
```bash
curl -X GET http://localhost:5000/api/test/owners/1
```

Expected: List of cached owners with names, emails, and HubSpot IDs

## Field Name Support

The system supports multiple field name variations for owner assignment:
- `owner` - Generic owner field (email format)
- `owner_email` - Explicit owner email field
- `ownerEmail` - Camel case owner email field

All are automatically resolved to `hubspot_owner_id` in the final HubSpot API call.

## Integration Testing

To test the complete owner assignment workflow:

1. **Create Simulation with Owner Data**: Include owner emails in your CSV template
2. **Run Simulation**: Execute a simulation job with owner assignments
3. **Verify Assignment**: Check that records are created with correct owners in HubSpot
4. **Test Graceful Failure**: Use invalid owner emails to verify records are still created (unassigned)

## Success Criteria

✅ **Owner Caching**: HubSpot owners are fetched and stored in database  
✅ **Email Resolution**: Owner emails are correctly resolved to HubSpot owner IDs  
✅ **Graceful Failure**: Invalid owner emails don't cause record creation failures  
✅ **Field Flexibility**: Multiple owner field formats are supported  
✅ **CRM Integration**: Contact, Company, and Deal creation includes owner assignment  
✅ **Cache Management**: Owner data is cached for performance  

## CSV Template Examples

### Contact with Owner
```csv
firstname,lastname,email,phone,owner
John,Doe,john.doe@example.com,555-0123,sales@yourcompany.com
Jane,Smith,jane.smith@example.com,555-0456,support@yourcompany.com
```

### Company with Owner
```csv
name,domain,industry,owner_email
Acme Corp,acme.com,Technology,sales@yourcompany.com
Beta LLC,beta.com,Healthcare,account-manager@yourcompany.com
```

### Deal with Owner
```csv
dealname,amount,dealstage,ownerEmail
Big Sale,50000,Appointment Scheduled,sales@yourcompany.com
Quick Win,5000,Qualified Lead,junior-sales@yourcompany.com
```

This system ensures reliable owner assignment while maintaining data integrity and providing graceful failure handling for missing or invalid owner emails.