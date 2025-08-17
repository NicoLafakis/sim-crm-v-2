# SimCRM - Game Boy CRM Simulation Platform

## Overview
SimCRM is a retro Game Boy-themed CRM simulation platform that gamifies business process management through HubSpot integration. It provides an 8-bit styled interface for users to create and manage CRM data simulations across different business themes and industries, making complex CRM concepts approachable and engaging using gaming metaphors. Users progress through player tiers, enhancing CRM learning through a nostalgic gaming experience. The project aims to offer a unique user experience by gamifying business process management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform features a Game Boy aesthetic, implemented through custom CSS variables, the `Press Start 2P` font, and custom CSS animations (scanlines, blinking text). A unified color palette is applied across all pages for consistency. The design is mobile-first, ensuring optimal display across devices with Game Boy console scaling. Interactive elements like a WinAmp-style record frequency mixer page enhance user interaction with information tooltips.

### Technical Implementations
- **Frontend**: Built with React 18 and TypeScript, utilizing Wouter for routing, shadcn/ui for design, TanStack Query for server state, and Zustand for client-side state management.
- **Backend**: An Express.js server provides a RESTful API with modular route handling and session-based authentication.
- **Data Models**: Includes `Users` for player profiles, `Sessions` for user state, and `Player Tiers` defining hierarchical progression with credit limits.
- **Simulation Logic**: Focuses on generating AI-powered CRM simulation strategies and business scenarios. It supports comprehensive custom property creation for all HubSpot property types with intelligent type detection, automatic property creation, and option management. An owner assignment system resolves owner emails to HubSpot IDs, and a pipeline/stage validation system for deal creation/updates caches HubSpot data to minimize API calls.
- **Rate Limiting & Concurrency**: A comprehensive rate limiting system with global concurrency control, exponential backoff with jittered delays, Retry-After header compliance, and per-provider statistics tracking.
- **LLM Persona/Data Generation Guardrails**: Implemented comprehensive JSON schema validation for all LLM-generated content with Zod schemas, including persona caching with TTL and deterministic seeding. This system also has auto-fix capabilities, early rejection of invalid LLM outputs, and multi-layer validation.

### Feature Specifications
- **Simulation Setup Flow**: Users navigate through Landing → Login/Registration → Profile Management (HubSpot connection) → Theme Selection → Industry Selection → Record Frequency (mixer board) → AI Strategy Generation → AI Results Display.
- **AI Strategy Generation**: Integrates with OpenAI to generate CRM simulation strategies and business scenarios, displaying processing states and storing responses.
- **Data Validation & Error Handling**: Comprehensive validation for HubSpot object types, including email format, phone number, required fields, and numeric values. HubSpot-specific error handling provides detailed messages for validation, authentication, authorization, and rate limit errors.
- **Association Type Coverage**: Centralized association mapping for all supported HubSpot object relationships with complete coverage across major CRM objects, pre-validation, enhanced error handling, and bidirectional support.
- **Staggered Simulation Scheduling**: Comprehensive staggered scheduling system based on Total Sets with precise timing control, multi-set scheduling, and fractional hour precision, optimized for rate limits.
- **Industry-Specific CSV Templates**: E-commerce uses specific CSV templates (won/lost cycles). Demo Mode uses programmatic generation with rapid execution (1 hour total). No universal templates are used.

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

### Data Reset & Association Fix (August 2025)
- **HubSpot Association API Fix**: Removed problematic `"associationCategory": "HUBSPOT_DEFINED"` field from all association creation payloads to resolve "Unable to infer object type" errors.
- **Comprehensive User Data Reset**: Implemented complete user data deletion system with `resetUserData()` backend method and `DELETE /api/user/:userId/reset` endpoint.
- **Frontend Reset Interface**: Added "Danger Zone" section in Profile page with two-step confirmation flow for data deletion.
- **Session State Synchronization**: Fixed TypeScript errors and improved session state management between database and frontend Zustand store.
- **Database Cleanup**: Enhanced reset functionality to clean orphaned records (jobs, job_steps, hubspot_stages) and ensure complete data removal.
- **User Experience**: Reset preserves user account while clearing all simulation data, tokens, configurations, and cached HubSpot data.

### Read-Only Property Fix (August 2025)
- **HubSpot Standard Property Protection**: Added comprehensive list of read-only HubSpot standard properties (pipeline, lifecyclestage, etc.) that cannot be modified via API.
- **Property Option Modification Prevention**: Enhanced ensureSelectOptions() function to skip read-only properties and prevent "read-only definition" errors.
- **Intelligent Property Detection**: Added checks for hubspotDefined and modificationMetadata.readOnlyOptions flags to identify system properties.
- **Enhanced Error Handling**: Improved error messaging to distinguish between read-only property errors and other API failures.
- **Pipeline/Stage Validation**: Fixed issues with pipeline and lifecyclestage properties by using existing values instead of attempting to create new options.
- **Clean Property Management**: System now properly respects HubSpot's property constraints and only modifies custom/modifiable properties.

### HubSpot Associations v4 API Compatibility (August 2025)
- **Batch Associations API Fix**: Updated `createAssociationsV4Batch` to use correct v4 endpoint `/crm/v4/associations/{fromObjectType}/{toObjectType}/batch/associate/default` with simplified payload structure.
- **Individual Associations API Fix**: Updated `createAssociations` to use `/crm/v4/objects/{fromObjectType}/{fromObjectId}/associations/default/{toObjectType}/{toObjectId}` endpoint for default associations.
- **Payload Structure Correction**: Removed problematic `associationCategory`, `associationTypeId`, and complex `types` array that caused "Unable to infer object type" errors.
- **Default Association Optimization**: Eliminated unnecessary fields in v4 API calls, allowing HubSpot to automatically infer relationship types from object types.
- **Error Resolution**: Fixed "contact|deal" inference errors by using proper v4 API format that separates object types in URL path rather than payload.
- **Comprehensive v4 Compliance**: All association creation now fully compliant with HubSpot's v4 associations API requirements for default relationships.

### Company Name Consistency Fix (August 2025)
- **Eliminated Company Name Mismatch**: Companies now automatically use the contact's company field value instead of generating new names via LLM, ensuring CRM data consistency.
- **LLM Prompt Update**: Modified company generation prompt to exclude name field - it's now populated directly from associated contact's company property.
- **Contact Field Enhancement**: Added missing contact fields (address, city, state, country, industry) to CSV templates and contact creation payloads.
- **Data Inheritance**: Companies inherit location and industry data from their associated contacts when available.
- **Fallback Handling**: Added safety check to ensure companies always have a name (required field), using timestamp-based fallback if needed.
- **CSV Template Updates**: Enhanced Demo mode CSV templates to include complete contact information fields for better data quality.