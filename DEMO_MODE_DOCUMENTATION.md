# Demo Mode Processes, Methods, and Endpoints Documentation

This document provides a comprehensive list of all processes, methods, and endpoints used in the SimCRM Demo Mode feature.

## Overview

The Demo Mode creates realistic CRM simulation data over a 1-hour duration using both programmatic generation and CSV templates. It supports up to 20 data sets with staggered timing to demonstrate overlapping CRM workflows.

---

## 1. PROCESSES

### 1.1 Demo Mode Initiation Process
- **Duration**: 1 hour (0.042 accelerator days)
- **Timing**: First set created 15 seconds after start, subsequent sets every 30-90 seconds
- **Maximum Sets**: 20 sets total
- **Record Distribution**: Configurable per set (contacts, companies, deals, tickets, notes)

### 1.2 Programmatic Demo Generation Process
1. **Job Creation**: `createDemoModeJob()` function generates job with programmatic timing
2. **Step Generation**: Creates job steps with staggered scheduling
3. **Record Creation**: Sequential creation of CRM records with associations
4. **Progress Tracking**: Real-time monitoring of completed/failed/pending steps

### 1.3 CSV Template Demo Process
1. **Template Loading**: Loads `simulation_timing_1h_36sets_with_payloads_1755371217278.csv`
2. **Schedule Processing**: Parses CSV timing and action specifications
3. **Payload Resolution**: Resolves template placeholders with actual values
4. **Execution**: Follows CSV-defined schedule for record operations

### 1.4 Rate Limiting and Retry Process
- **Exponential Backoff**: Implements progressive delay on API rate limits (429 errors)
- **Retry-After Header**: Honors provider-specified retry delays
- **Jitter Addition**: Prevents thundering herd effects
- **Circuit Breaking**: Handles severe rate limit scenarios

---

## 2. METHODS

### 2.1 Core Demo Mode Methods

#### `createDemoModeJob(simulation, outcome, contactSeq, setStartAt)`
- **Purpose**: Creates programmatic demo job with timing configuration
- **Location**: `server/orchestrator.ts:404-582`
- **Returns**: `{ jobId: number; stepsCount: number }`

#### `createDemoModeJobFromCSV(simulation, outcome, contactSeq, setStartAt)`
- **Purpose**: Creates demo job from CSV template
- **Location**: `server/orchestrator.ts:587-700`
- **Returns**: `{ jobId: number; stepsCount: number }`

### 2.2 Record Creation Methods

#### `executeCreateContact(data, token, step)`
- **Purpose**: Creates HubSpot contact with deduplication and validation
- **Location**: `server/orchestrator.ts` (referenced in context)
- **Features**: Email deduplication, property validation, association handling

#### `executeCreateCompany(data, token, step)`
- **Purpose**: Creates HubSpot company with domain-based deduplication
- **Location**: `server/orchestrator.ts` (referenced in context)
- **Features**: Domain deduplication, property validation, association handling

#### `executeCreateDeal(data, token, step)`
- **Purpose**: Creates HubSpot deal with pipeline/stage validation
- **Location**: `server/orchestrator.ts:2184-2321`
- **Features**: Pipeline validation, deal stage resolution, owner assignment

#### `executeCreateTicket(data, token, step)`
- **Purpose**: Creates HubSpot ticket with priority and pipeline handling
- **Location**: `server/orchestrator.ts:2371-2420`
- **Features**: Ticket pipeline validation, priority assignment, association handling

#### `executeCreateNote(data, token, step)`
- **Purpose**: Creates HubSpot note with timestamp and associations
- **Location**: `server/orchestrator.ts:2326-2366`
- **Features**: Timestamp addition, association to contacts/deals/companies

#### `executeUpdateDeal(data, token, step)`
- **Purpose**: Updates existing HubSpot deal with new stage or properties
- **Location**: `server/orchestrator.ts:2425-2508`
- **Features**: Deal stage progression, close date setting, pipeline updates

#### `executeUpdateTicket(data, token, step)`
- **Purpose**: Updates existing HubSpot ticket with new status or stage
- **Location**: `server/orchestrator.ts:2509-2551`
- **Features**: Ticket stage progression, priority updates

#### `executeCloseTicket(data, token, step)`
- **Purpose**: Closes HubSpot ticket with final status
- **Location**: `server/orchestrator.ts:2552+`
- **Features**: Ticket closure, final status setting

#### `executeJobStepAction(step)`
- **Purpose**: Main orchestrator method that executes any job step action
- **Location**: `server/orchestrator.ts:1174-1400`
- **Features**: Action routing, data generation, LLM integration, step execution

### 2.3 Manual Demo Creation Methods

#### `createRecordsManually()` (manual-creation.js)
- **Purpose**: Creates sample contact, company, deal with associations for demonstration
- **Location**: `manual-creation.js:4-87`
- **Features**: Manual record creation with hardcoded realistic data

#### Manual Creation API Route (server/routes.ts)
- **Purpose**: Creates demonstration records via API endpoint
- **Location**: `server/routes.ts:201-300`
- **Features**: Timestamped unique data, automatic associations

### 2.4 Association Methods

#### `createAssociations(recordId, objectType, associationsTpl, token)`
- **Purpose**: Creates record associations using legacy format
- **Location**: `server/orchestrator.ts` (referenced in execution methods)
- **Example Usage**: 
```typescript
await createAssociations(dealId, 'deals', {
  contact: contactId,
  company: companyId
}, token);
```

#### `createAssociationsV4Batch(recordId, objectType, associationsTpl, associationType, token)`
- **Purpose**: Creates associations using HubSpot v4 batch API
- **Location**: `server/orchestrator.ts` (referenced in execution methods)
- **Features**: Batch processing, multiple association types, improved performance

### 2.5 Core HubSpot API Methods

#### `makeHubSpotRequest(method, endpoint, data, token)`
- **Purpose**: Core HubSpot API request method with error handling
- **Location**: `server/hubspot-service.js`
- **Features**: Rate limit handling, retry logic, error parsing

#### `createRecordWithRetry(objectType, data, token, originalData)`
- **Purpose**: Creates HubSpot record with comprehensive retry logic
- **Location**: `server/orchestrator.ts:117-190`
- **Features**: Exponential backoff, property creation, option management

### 2.6 Validation and Utility Methods

#### `validateDealStage(userId, data, token)`
- **Purpose**: Validates deal pipeline and stage IDs
- **Returns**: `{ isValid: boolean, error?: string, resolvedData?: any }`

#### `ensureHubSpotProperties(objectType, properties, token, data?)`
- **Purpose**: Ensures required properties exist in HubSpot
- **Features**: Property creation if missing, type validation

#### `convertPropertiesToHubSpotFormat(data)`
- **Purpose**: Converts property names to HubSpot-compatible format
- **Features**: Camel case to snake case conversion

#### `validateAndCoerceRecordData(data, objectType)`
- **Purpose**: Validates and coerces record data to proper types
- **Returns**: `{ validData: any, errors: string[] }`

#### `trimStringsDeep(data)`
- **Purpose**: Deep trims all string properties in nested objects
- **Features**: Recursive string trimming, null/undefined handling

#### `validateDataOrThrow(data, actionType)`
- **Purpose**: Validates data according to strict validation rules
- **Features**: Throws validation errors, comprehensive data checks

### 2.7 Data Generation and Enrichment Methods

#### `generateRealisticData(recordType, userTheme, industry, context, step)`
- **Purpose**: Generates realistic CRM data using LLM
- **Location**: `server/orchestrator.ts`
- **Features**: Theme-based generation, industry-specific data, contextual relevance

#### `enrichContactWithLLM(baseData, userTheme, industry, context, step)`
- **Purpose**: Enriches contact data with LLM-generated realistic details
- **Features**: Professional details, contact information, industry relevance

#### `resolveOwnerEmail(userId, data, token)`
- **Purpose**: Resolves owner email addresses to HubSpot owner IDs
- **Features**: Owner lookup, email-to-ID mapping

### 2.8 Rate Limiting Methods

#### `createRecordWithRetry(objectType, data, token, originalData)`
- **Purpose**: Creates HubSpot record with exponential backoff retry logic
- **Features**: Rate limit handling, retry-after header support

#### Rate Limit Calculation Algorithm:
```typescript
// Base exponential backoff
const exponentialDelay = Math.pow(2, attempt) * baseDelayMs;

// Add jitter to prevent thundering herd
const jitter = exponentialDelay * jitterFactor * Math.random();
const totalDelay = exponentialDelay + jitter;

// Cap at maximum delay
return Math.min(totalDelay, maxDelayMs);
```

### 2.9 Context and Template Resolution Methods

#### `storeRecordIdInContext(jobId, recordIdTpl, actualId)`
- **Purpose**: Stores created record IDs for template resolution
- **Features**: Template placeholder resolution, ID mapping

#### `resolveTemplateContext(step, context)`
- **Purpose**: Resolves template placeholders in job step data
- **Features**: Dynamic placeholder replacement, context injection

#### `getJobContext(jobId)`
- **Purpose**: Retrieves stored context and record IDs for a job
- **Returns**: Context object with record ID mappings

---

## 3. ENDPOINTS

### 3.1 HubSpot CRM API Endpoints (v3)

#### Contact Endpoints
- **Create**: `POST /crm/v3/objects/contacts`
  - **Headers**: `Authorization: Bearer <PRIVATE_APP_TOKEN>`, `Content-Type: application/json`
  - **Payload**: `{ "properties": { "firstname": "...", "lastname": "...", "email": "..." } }`
- **Update**: `PATCH /crm/v3/objects/contacts/{id}`
  - **Headers**: `Authorization: Bearer <PRIVATE_APP_TOKEN>`, `Content-Type: application/json`
  - **Payload**: `{ "properties": { "lifecyclestage": "..." } }`

#### Company Endpoints
- **Create**: `POST /crm/v3/objects/companies`
  - **Headers**: `Authorization: Bearer <PRIVATE_APP_TOKEN>`, `Content-Type: application/json`
  - **Payload**: `{ "properties": { "name": "...", "domain": "...", "industry": "..." } }`
- **Update**: `PATCH /crm/v3/objects/companies/{id}`
  - **Headers**: `Authorization: Bearer <PRIVATE_APP_TOKEN>`, `Content-Type: application/json`
  - **Payload**: `{ "properties": { "lifecyclestage": "..." } }`

#### Deal Endpoints
- **Create**: `POST /crm/v3/objects/deals`
  - **Headers**: `Authorization: Bearer <PRIVATE_APP_TOKEN>`, `Content-Type: application/json`
  - **Payload**: `{ "properties": { "dealname": "...", "pipeline": "...", "dealstage": "...", "amount": "..." } }`
- **Update**: `PATCH /crm/v3/objects/deals/{id}`
  - **Headers**: `Authorization: Bearer <PRIVATE_APP_TOKEN>`, `Content-Type: application/json`
  - **Payload**: `{ "properties": { "dealstage": "contractsent", "closedate": "2024-01-15T00:00:00.000Z" } }`

#### Ticket Endpoints
- **Create**: `POST /crm/v3/objects/tickets`
  - **Headers**: `Authorization: Bearer <PRIVATE_APP_TOKEN>`, `Content-Type: application/json`
  - **Payload**: `{ "properties": { "subject": "...", "hs_pipeline": "...", "hs_pipeline_stage": "...", "hs_ticket_priority": "..." } }`
- **Update**: `PATCH /crm/v3/objects/tickets/{id}`
  - **Headers**: `Authorization: Bearer <PRIVATE_APP_TOKEN>`, `Content-Type: application/json`
  - **Payload**: `{ "properties": { "hs_pipeline_stage": "..." } }`

#### Note Endpoints
- **Create**: `POST /crm/v3/objects/notes`
  - **Headers**: `Authorization: Bearer <PRIVATE_APP_TOKEN>`, `Content-Type: application/json`
  - **Payload**: `{ "properties": { "hs_note_body": "...", "hs_timestamp": "2024-01-15T10:30:00.000Z" } }`

### 3.2 HubSpot Association API Endpoints (v4)

#### Batch Association Creation
- **Endpoint**: `POST /crm/v4/associations/{fromObject}/{toObject}/batch/create`
- **Headers**: `Authorization: Bearer <PRIVATE_APP_TOKEN>`, `Content-Type: application/json`
- **Example**: `POST /crm/v4/associations/deals/contacts/batch/create`
- **Payload**:
```json
{
  "inputs": [
    {
      "from": { "id": "deal_id" },
      "to": { "id": "contact_id" },
      "type": "deal_to_contact"
    }
  ]
}
```

#### Association Types Used in Demo Mode:
- `deal_to_contact`
- `deal_to_company`
- `ticket_to_contact`
- `ticket_to_company`
- `note_to_contact`
- `note_to_deal`
- `note_to_company`

### 3.3 HubSpot Pipeline and Property Validation Endpoints

#### Pipeline Endpoints
- **Get Deal Pipelines**: `GET /crm/v3/pipelines/deals`
- **Get Ticket Pipelines**: `GET /crm/v3/pipelines/tickets`

#### Property Endpoints
- **Get Object Properties**: `GET /crm/v3/properties/{objectType}`
- **Create Property**: `POST /crm/v3/properties/{objectType}`

### 3.4 Internal SimCRM API Endpoints

#### Demo Mode Simulation Endpoints
- **Start Demo Simulation**: `POST /api/simulation/start`
  - **Purpose**: Initiates a new demo mode simulation
  - **Location**: `server/routes.ts:683`
  - **Payload**: 
  ```json
  {
    "theme": "Healthcare Innovation",
    "industry": "demo",
    "duration_days": 0.042,
    "timeSpan": "1 hour",
    "record_distribution": {
      "contacts": 30,
      "companies": 30,
      "deals": 30,
      "tickets": 15,
      "notes": 45
    }
  }
  ```

- **Get User Simulations**: `GET /api/user/{userId}/simulations`
  - **Purpose**: Retrieves all simulations for a user including demo mode simulations
  - **Location**: `server/routes.ts:82`

- **Get Simulation Progress**: `GET /api/simulation/progress`
  - **Purpose**: Real-time progress tracking for active simulations
  - **Location**: `server/routes.ts:912`
  - **Returns**: Step counts, completion status, live metrics

- **Get Simulation Logs**: `GET /api/simulation/{simulationId}/logs`
  - **Purpose**: Detailed execution logs for debugging and monitoring
  - **Location**: `server/routes.ts:488`

- **Pause Simulation**: `POST /api/simulation/{simulationId}/pause`
  - **Purpose**: Pauses active demo simulation
  - **Location**: `server/routes.ts:824`

- **Resume Simulation**: `POST /api/simulation/{simulationId}/resume`
  - **Purpose**: Resumes paused demo simulation
  - **Location**: `server/routes.ts:852`

- **Stop Simulation**: `POST /api/simulation/{simulationId}/stop`
  - **Purpose**: Stops active demo simulation
  - **Location**: `server/routes.ts:880`

#### Manual Demo Creation Endpoint
- **Create Manual Demo Records**: `POST /api/create-manual-records`
  - **Purpose**: Creates sample contact, company, deal, and associations for demonstration
  - **Location**: `server/routes.ts:187-300`
  - **Features**: Timestamped unique data, automatic associations
  - **Returns**: Created record IDs and details

#### Rate Limiting Test Endpoints
- **Test Rate Limiting**: `GET /api/test/rate-limiting`
- **Simulate Rate Limits**: `POST /api/test/simulate-rate-limits`
  - **Payload**: `{ "everyNthRequest": 3, "durationMs": 30000, "providers": ["hubspot"], "testRetryAfter": true }`

### 3.5 Client-Side Demo Mode Components

#### Industry Selection Component
- **File**: `client/src/pages/industry-selection.tsx`
- **Purpose**: Allows user to select Demo Mode (1 hour) vs E-commerce (90 days)
- **Demo Mode Features**:
  - Icon: 🎮
  - Description: "1 hour quick demo"
  - Enabled by default alongside E-commerce option

#### Record Frequency Component
- **File**: `client/src/pages/record-frequency.tsx`
- **Purpose**: Configures record distribution for demo mode
- **Demo Mode Behavior**:
  - Duration locked to "1 hour"
  - Total Sets slider disabled (locked)
  - Maximum 600 total records (vs 450 for other modes)
  - Special messaging: "Demo Mode: Creates records in rapid succession over 1 hour. Great for testing!"
  - Locked indicator: "Demo Mode - Locked"

#### Progress Page Component
- **File**: `client/src/pages/progress-page.tsx`
- **Purpose**: Real-time monitoring of demo mode simulation progress
- **Demo Mode Features**:
  - Live timer showing elapsed time
  - Step completion tracking (completed/processing/failed/pending)
  - Record distribution display
  - Simulation control buttons (pause/resume/stop)
  - Real-time updates via polling or WebSocket

---

## 4. DATA FLOW AND SCHEDULING

### 4.1 Demo Mode Data Flow
1. **Initialization**: User selects Demo Mode industry
2. **Job Creation**: System creates job with 20 sets, 1-hour duration
3. **Step Scheduling**: Each set scheduled with 30-90 second intervals
4. **Record Creation**: Sequential creation (Contact → Company → Deal → Ticket → Note)
5. **Association Creation**: Records linked using HubSpot v4 batch API
6. **Progress Tracking**: Real-time updates on completion status

### 4.2 Timing Schedule (First 300 seconds)
- **T+15s**: Set 1 creation starts
- **T+45-105s**: Set 2 creation starts (random 30-90s after Set 1)
- **T+75-165s**: Set 3 creation starts
- **T+105-225s**: Set 4 creation starts
- **Continue pattern**: Each subsequent set starts 30-90s after previous set

### 4.3 Record Creation Sequence (per set)
1. **T+0s**: Contact creation
2. **T+1s**: Company creation  
3. **T+2s**: Deal creation + associations to contact/company
4. **T+3s**: Ticket creation + association to contact
5. **T+4s**: Note creation + associations to contact/deal

### 4.4 CSV Template Processing
- **Total Sets**: 36 sets over 1 hour
- **Schedule Source**: `simulation_timing_1h_36sets_with_payloads_1755371217278.csv`
- **Placeholder Resolution**: `{{simulationId}}`, `{{run_at_iso}}`, `{{assocId.*}}`
- **Action Types**: `create_contact`, `create_company`, `create_deal`, `update_deal`, `create_ticket`, `create_note`

---

## 5. ERROR HANDLING AND RESILIENCE

### 5.1 Rate Limit Handling
- **Detection**: HTTP 429 status codes and "rate limit" error messages
- **Backoff Strategy**: Exponential backoff with jitter
- **Retry-After**: Honor provider-specified retry delays
- **Maximum Retries**: Configurable limit with circuit breaking

### 5.2 Validation and Data Quality
- **Pipeline Validation**: Ensures deal/ticket stages exist before creation
- **Property Validation**: Creates missing HubSpot properties automatically
- **Data Coercion**: Converts string numbers to integers, validates formats
- **Deduplication**: Prevents duplicate records based on email/domain/name

### 5.3 Progress Monitoring
- **Step Status Tracking**: `pending`, `processing`, `completed`, `failed`
- **Live Updates**: WebSocket-based progress updates to client
- **Error Logging**: Comprehensive logging with retry context
- **Recovery Mechanisms**: Failed steps can be retried manually

---

## 6. CONFIGURATION AND CUSTOMIZATION

### 6.1 Demo Mode Configuration
```typescript
{
  mode: 'demo',
  totalSets: 20,                    // Maximum 20 sets
  recordsPerSet: {
    contacts: 1-2,                  // Calculated based on total distribution
    companies: 1-2,
    deals: 1-2,
    tickets: 0-1,
    notes: 1-2
  },
  durationHours: 1,                 // Fixed 1-hour duration
  acceleratorDays: '0.042'          // 1 hour = 0.042 days
}
```

### 6.2 Record Distribution Calculation
```typescript
const totalSets = Math.min(20, Math.floor((totalContacts || 30) / 1.5));
const recordsPerSet = {
  contacts: Math.floor(totalContacts / totalSets),
  companies: Math.floor(totalCompanies / totalSets),
  deals: Math.floor(totalDeals / totalSets),
  tickets: Math.floor(totalTickets / totalSets),
  notes: Math.floor(totalNotes / totalSets)
};
```

### 6.3 Environment Variables
- `STRICT_VALIDATION_BEFORE_PERSISTENCE`: Enable/disable pre-persistence validation
- `ENABLE_SEARCH_FALLBACK`: Enable deduplication via search
- `HUBSPOT_RATE_LIMIT_*`: Rate limiting configuration

---

## 7. MONITORING AND DEBUGGING

### 7.1 Logging Output Examples
```
🎮 Creating Demo Mode job with programmatic timing
✅ Created 85 steps for Demo Mode job 123
🚦 HubSpot rate limit triggered. Backing off for 2347ms
🔄 HubSpot API retry 1 for POST /crm/v3/objects/contacts: Rate limit exceeded
✅ Request succeeded after 2 retries (4.2s total)
🔍 Deduplication: Using existing deal 456 for Enterprise Solution
```

### 7.2 Progress Display
- **Live Simulation Status**: Shows completed/processing/failed/pending steps
- **Record Distribution**: Displays planned vs actual record counts
- **Timing Information**: Shows duration and completion estimates
- **Error Details**: Lists failed operations with retry options

This documentation provides a complete reference for understanding and maintaining the SimCRM Demo Mode functionality.