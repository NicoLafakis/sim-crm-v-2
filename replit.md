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
- **Staggered Simulation Scheduling**: Implemented a comprehensive staggered scheduling system based on Contacts count with precise timing control, multi-set scheduling, and fractional hour precision, optimized for rate limits.

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
- **OpenAI API**: Used for AI strategy and scenario generation.
- **Express sessions**: For server-side session management.