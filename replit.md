# SimCRM - Game Boy CRM Simulation Platform

## Overview
SimCRM is a retro Game Boy-themed CRM simulation platform that gamifies business process management through HubSpot integration. It provides an 8-bit styled interface for users to create and manage CRM data simulations across different business themes and industries. Users progress through player tiers, making CRM learning engaging through a nostalgic gaming experience. The project aims to make complex CRM concepts approachable and engaging using gaming metaphors, offering a unique user experience.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform features a Game Boy aesthetic, implemented through:
- **Game Boy Theming**: Custom CSS variables, `Press Start 2P` font, and custom CSS animations (scanlines, blinking text) replicate authentic Game Boy visuals.
- **Color Palette**: A comprehensive unified color palette is applied across all pages for consistency.
- **Responsive Design**: A mobile-first approach ensures optimal display across devices, with Game Boy console scaling.
- **Interactive Elements**: Features like a WinAmp-style record frequency mixer page with vertical sliders and an equalizer-style interface enhance user interaction, supported by information tooltips.

### Technical Implementations
- **Frontend**: Built with React 18 and TypeScript, utilizing Wouter for routing, shadcn/ui for design, TanStack Query for server state, and Zustand for client-side state management.
- **Backend**: An Express.js server provides a RESTful API with modular route handling and session-based authentication.
- **Data Models**: Includes `Users` for player profiles, `Sessions` for user state, and `Player Tiers` defining hierarchical progression with credit limits.
- **Simulation Logic**: Focuses on generating AI-powered CRM simulation strategies and business scenarios. It supports comprehensive custom property creation for all HubSpot property types (text, number, date, bool, single-select, multi-select) with intelligent type detection, automatic property creation, and option management. It also includes an owner assignment system that resolves owner emails to HubSpot IDs and a pipeline/stage validation system for deal creation/updates, caching HubSpot data to minimize API calls.
- **Rate Limiting & Concurrency**: A comprehensive rate limiting system with global concurrency control, exponential backoff with jittered delays, Retry-After header compliance, and per-provider statistics tracking.
- **LLM Persona/Data Generation Guardrails**: Implemented comprehensive JSON schema validation for all LLM-generated content with Zod schemas, including persona caching with TTL and deterministic seeding. This system also has auto-fix capabilities, early rejection of invalid LLM outputs, and multi-layer validation.

### Feature Specifications
- **Simulation Setup Flow**: Users navigate through Landing → Login/Registration → Profile Management (HubSpot connection) → Theme Selection → Industry Selection → Record Frequency (mixer board) → AI Strategy Generation → AI Results Display.
- **AI Strategy Generation**: Integrates with OpenAI to generate CRM simulation strategies and business scenarios, displaying processing states and storing responses.
- **Data Validation & Error Handling**: Comprehensive validation is implemented for HubSpot object types, including email format, phone number, required fields, and numeric values. HubSpot-specific error handling provides detailed messages for validation, authentication, authorization, and rate limit errors.
- **Association Type Coverage**: Implemented centralized association mapping for all supported HubSpot object relationships with complete coverage across major CRM objects, pre-validation, enhanced error handling, and bidirectional support.
- **Staggered Simulation Scheduling**: Implemented a comprehensive staggered scheduling system based on Total Sets with precise timing control, multi-set scheduling, and fractional hour precision, optimized for rate limits.
- **Industry-Specific CSV Templates**: E-commerce uses specific CSV templates (won/lost cycles). Demo Mode uses programmatic generation with rapid execution (1 hour total). No universal templates are used anymore.

## External Dependencies

### Core Dependencies
- **Vite**: Build tool and development server.
- **Drizzle ORM**: Database toolkit.
- **@neondatabase/serverless**: PostgreSQL database driver for serverless environments.

### UI and Styling
- **Radix UI**: Provides accessible component primitives.
- **class-variance-authority**: Manages component variants.
- **Tailwind CSS**: Utility-first CSS framework for styling.

### State Management
- **TanStack React Query**: Manages server state and caching.
- **Zustand**: Lightweight client-side state management.

### Development Tools
- **TypeScript**: Ensures type safety across the codebase.
- **ESBuild**: Fast JavaScript bundler.

### External Services
- **HubSpot API**: Primary CRM integration for data simulation and management.
- **PostgreSQL**: Configured database backend.
- **OpenAI API**: Used for AI strategy and scenario generation (gpt-5-nano model only).
- **Express sessions**: For server-side session management.

## Recent Updates

### Industry Simplification & Demo Mode Implementation (January 2025)
- **Major Simplification**: Reduced industries from 12+ to only 2 active options (Demo Mode and E-commerce)
- **Demo Mode Added**: New 1-hour quick demo mode for users without API keys to test the system
- **Removed Universal Templates**: Eliminated confusing universal 30-day templates, now only industry-specific
- **UI Paradigm Shift**: Changed from "record distribution" to "Total Sets" concept for clearer understanding
- **Industry Status**: Demo and E-commerce fully enabled, all others marked as "Coming Soon"
- **Duration System**: Demo Mode runs 1 hour, E-commerce runs 90 days - no user selection needed
- **Template Management**: E-commerce uses CSV templates (ClosedWon/ClosedLost), Demo uses programmatic generation

### HubSpot Validation System Implementation (January 2025)
- **Comprehensive Validation Process**: Implemented multi-step HubSpot validation including token format verification, API connectivity testing, owner caching, pipeline/stage caching, and permissions verification.
- **Real-time Progress Display**: Enhanced hubspot-setup.tsx with live validation progress showing detailed step-by-step results with success/warning/error indicators.
- **Fixed Response Parsing**: Resolved frontend JSON response parsing issue that was causing valid tokens to show as invalid.
- **Owner & Pipeline Caching**: Automated caching of HubSpot owners and deal pipelines during validation for later use in simulation execution.
- **Enhanced Error Handling**: Improved error messaging and logging for better debugging and user feedback.

### OpenAI Model Update (January 2025)
- **Model Standardization**: Updated all OpenAI API calls to use only gpt-5-nano model as requested, removing gpt-4o-mini references.
- **LLM Integration**: Confirmed proper integration with AI-powered CRM simulation strategy generation.

### Custom Property Creation System Extended (January 2025)
- **Complete Object Coverage**: Extended custom property creation to ALL HubSpot objects (Contacts, Companies, Deals, Tickets, Notes) for both create and update operations.
- **Missing Implementation Fixed**: Added property creation calls to `executeCreateNote`, `executeUpdateDeal`, `executeUpdateTicket`, and `executeCloseTicket` functions.
- **Comprehensive Support**: System now automatically creates missing custom properties with intelligent type detection for all supported HubSpot object types during both creation and update operations.
- **Property Type Detection**: Supports all HubSpot property types (text, number, date, bool, single-select, multi-select) with automatic option management for enumeration fields.

### HubSpot Write Access Validation & Property Naming Fix (August 2025)
- **Write Access Confirmed**: Successfully tested and confirmed full HubSpot CRM write permissions - created test contacts (IDs: 147093636767, 146999381842, 146981646084).
- **Property Naming Compliance**: Fixed all property naming to follow HubSpot's strict requirements: lowercase only, no special characters, standard property mapping.
- **Standard Property Mapping**: Implemented comprehensive mapping system for camelCase to HubSpot standard properties (firstName→firstname, jobTitle→jobtitle, etc.).
- **Property Conflict Resolution**: Enhanced property creation to properly handle existing standard properties and avoid unnecessary 409 conflicts.
- **Update Action Support**: Added generic "Update" action handler that routes to appropriate record-specific update functions based on record type.
- **Job Control Fixes**: Resolved job runner stopping issues and improved simulation lifecycle management.
- **Performance Optimization**: Eliminated unnecessary property creation attempts, reducing API calls and improving response times.
- **Validated Operations**: Confirmed successful creation of contacts, companies, deals, tickets, and notes with proper field formatting and validation.

### Data Generation Quality Fix (August 2025)
- **Empty Records Issue Resolved**: Fixed critical bug where LLM-generated complete contact/company data was being replaced with minimal theme/industry data.
- **Root Cause**: The validation.validatedData was incorrectly modifying the data structure; switched to using raw LLM response data directly.
- **Enhanced LLM Prompts**: Improved prompts with explicit examples and "MUST return complete data" instructions for better data generation.
- **Validation System Fix**: Removed problematic strict validation (validateDataOrThrow) that expected wrong schema structure.

- **Confirmed Working**: Successfully creating contacts (ID: 146981817209) and companies with complete realistic data including names, emails, phone numbers, job titles, etc.

### Template Resolution & Invalid API Calls Fix (August 2025)
- **Invalid API Calls Eliminated**: Fixed critical issue where system was making invalid HubSpot API calls to URLs like `/crm/v3/objects/deals/deal_47_{{contactSeq}}` with unresolved template variables.
- **Root Cause**: Template references were not being resolved to actual HubSpot record IDs before making update API calls.
- **Template Resolution Fix**: Added proper template reference resolution in executeJobStepAction for all update operations (update_deal, update_ticket, close_ticket).
- **Context Storage Fix**: Enhanced all creation functions (executeCreateDeal, executeCreateNote, executeCreateTicket) to properly store record IDs in job context via storeRecordIdInContext.
- **LLM Prompt Improvements**: Added explicit instructions to prevent LLM from appending seeds or random values to pipeline/stage IDs.
- **Validated Solution**: Confirmed elimination of invalid API calls and successful template resolution from create operations to update operations.

### Simulation Execution & Stop Button Fix (August 2025)
- **Simulation Execution Fixed**: Resolved "Unknown record type for update: Company" error by adding proper handling for Company update operations in orchestrator.
- **Stop Button Functionality**: Confirmed stop functionality works correctly - updates simulation status to 'stopped' and cancels all pending/paused job steps.
- **Manual Record Creation**: Created comprehensive manual record creation endpoint that successfully creates contacts, companies, and deals with proper associations.
- **Job Runner Integration**: Verified that stopped simulations properly cease execution and do not continue processing in background.
- **Error Handling**: Enhanced error handling for unknown record types to gracefully skip unsupported operations rather than failing.

### Codebase Cleanup & Streamlining (August 2025)
- **Test Infrastructure Removal**: Eliminated all test-related files and custom test frameworks in favor of using existing demo mode infrastructure.
- **Download Package Cleanup**: Removed all downloadable versions, zip files, and packaging scripts (simcrm-download-v2.zip, create-download-package.js, README-Download.md, CHANGELOG-v2.md).
- **Code Simplification**: Removed test endpoints from server routes and cleaned up all references to deleted test files.
- **Focus Shift**: Streamlined codebase to focus on demo mode system for Marvel theme simulations rather than maintaining separate test infrastructure.
- **Documentation Cleanup**: Removed redundant documentation files while preserving essential project information in core files.

### Comprehensive Simulation Stop Functionality Fix (August 2025)
- **Race Condition Resolution**: Implemented comprehensive solution to prevent race conditions between stop operations and job runner execution.
- **In-Memory Cancellation Tracking**: Added `cancelledSimulations` Set for immediate cancellation marking, preventing new steps from being picked up during stop operations.
- **Database-Level Filtering**: Enhanced `getDueJobSteps()` to explicitly exclude stopped simulations at query level, preventing race conditions in step selection.
- **Cooperative Cancellation**: Added multiple cancellation checkpoints throughout step execution lifecycle including before LLM calls, API operations, and after expensive operations.
- **Atomic Stop Operations**: Implemented database transactions in stop endpoint to ensure atomic updates of simulation status and step cancellation.
- **Enhanced Job Runner Awareness**: Added simulation status validation before marking steps as 'processing' and multiple layers of cancellation checking.
- **Improved Error Handling**: Enhanced stop endpoint with better logging, error messages, and response data including timestamps and cancellation flags.
- **Processing Step Cancellation**: Extended cancellation to include 'processing' steps in addition to 'pending' and 'paused' steps for complete coverage.
- **Template Resolution Safety**: Added cancellation checks during template reference resolution to prevent API calls with unresolved references during stop operations.
- **Final Validation**: All LSP errors resolved and system tested for proper stop functionality without race conditions or continued background execution.