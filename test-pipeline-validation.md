# Pipeline and Stage Validation Test Guide

This document explains how to test the newly implemented pipeline and stage validation system for deals.

## What Was Implemented

1. **Database Tables**: Added `hubspot_pipelines` and `hubspot_stages` tables to cache HubSpot pipeline/stage data
2. **Validation Function**: `validateDealStage()` that checks pipeline/stage validity and resolves names to IDs
3. **Caching System**: Automatic fetching and caching of pipeline/stage data from HubSpot API
4. **Integration**: Deal creation and update operations now validate pipeline/stage before processing
5. **Error Handling**: Non-retryable failures for invalid pipeline/stage combinations

## Test Scenarios

### Test 1: Valid Pipeline/Stage (by name)
```bash
curl -X POST http://localhost:5000/api/test/pipeline-validation \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "dealData": {
      "dealname": "Test Deal 1",
      "amount": "5000",
      "pipeline": "Sales Pipeline",
      "dealstage": "Qualified Lead"
    }
  }'
```

Expected: `isValid: true` with resolved HubSpot IDs

### Test 2: Valid Stage Only (uses default pipeline)
```bash
curl -X POST http://localhost:5000/api/test/pipeline-validation \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "dealData": {
      "dealname": "Test Deal 2",
      "amount": "3000",
      "dealstage": "Appointment Scheduled"
    }
  }'
```

Expected: `isValid: true` with default pipeline ID

### Test 3: Invalid Stage Name
```bash
curl -X POST http://localhost:5000/api/test/pipeline-validation \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "dealData": {
      "dealname": "Test Deal 3",
      "amount": "2000",
      "dealstage": "Invalid Stage Name"
    }
  }'
```

Expected: `isValid: false` with clear error message listing available stages

### Test 4: Invalid Pipeline Name
```bash
curl -X POST http://localhost:5000/api/test/pipeline-validation \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "dealData": {
      "dealname": "Test Deal 4",
      "amount": "1000",
      "pipeline": "Nonexistent Pipeline",
      "dealstage": "Qualified Lead"
    }
  }'
```

Expected: `isValid: false` with clear error message listing available pipelines

### Test 5: Clear Cache and Retest
```bash
# Clear the cache first
curl -X POST http://localhost:5000/api/test/clear-pipeline-cache \
  -H "Content-Type: application/json" \
  -d '{"userId": 1}'

# Then retest validation (should fetch fresh data from HubSpot)
curl -X POST http://localhost:5000/api/test/pipeline-validation \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "dealData": {
      "dealname": "Test Deal 5",
      "amount": "4000",
      "dealstage": "Qualified Lead"
    }
  }'
```

Expected: Cache refresh message, then successful validation

## Integration Test: Actual Deal Creation

The validation will also be automatically triggered during actual deal creation in simulations:

1. Create a simulation with deal creation steps
2. Use invalid pipeline/stage names in the CSV data
3. Observe that the deal creation step fails with `failed_non_retryable` status
4. Check the error message in the step result

## Checking Results

After running tests, you can check:

1. **Database State**: Query `hubspot_pipelines` and `hubspot_stages` tables to see cached data
2. **Console Logs**: Look for validation messages like `✅ Deal stage validation passed`
3. **Error Logs**: Look for `❌ Non-retryable failure` messages for invalid stages

## Success Criteria

✅ **Pipeline Caching**: HubSpot pipelines and stages are fetched and stored in database  
✅ **Name Resolution**: Stage/pipeline names are correctly resolved to HubSpot IDs  
✅ **Validation Errors**: Invalid combinations trigger clear, non-retryable failures  
✅ **Fallback Behavior**: Missing data uses sensible defaults (first pipeline/stage)  
✅ **Integration**: Deal creation/update operations use validation before API calls  

This system ensures that deal operations always use valid pipeline/stage combinations, preventing HubSpot API errors and providing clear feedback when CSV data contains invalid stage names.