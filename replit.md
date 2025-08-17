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

### Read-Only Property Fix (August 2025)
- **HubSpot Standard Property Protection**: Added comprehensive list of read-only HubSpot standard properties (pipeline, lifecyclestage, etc.) that cannot be modified via API.
- **Property Option Modification Prevention**: Enhanced ensureSelectOptions() function to skip read-only properties and prevent "read-only definition" errors.
- **Intelligent Property Detection**: Added checks for hubspotDefined and modificationMetadata.readOnlyOptions flags to identify system properties.
- **Enhanced Error Handling**: Improved error messaging to distinguish between read-only property errors and other API failures.
- **Pipeline/Stage Validation**: Fixed issues with pipeline and lifecyclestage properties by using existing values instead of attempting to create new options.
- **Clean Property Management**: System now properly respects HubSpot's property constraints and only modifies custom/modifiable properties.