# SimCRM - Game Boy CRM Simulation Platform

## Overview

SimCRM is a retro Game Boy-themed CRM simulation platform that gamifies business process management through HubSpot integration. The application provides an 8-bit styled interface where users can create and manage CRM data simulations across different business themes and industries. Users progress through player tiers with increasing credit limits and features, making CRM learning engaging through a nostalgic gaming experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**August 13, 2025** - Advanced Orchestrator with LLM Integration and CRM Validation
- Enhanced server/orchestrator.ts with comprehensive LLM data generation and HubSpot API integration
- Implemented OpenAI integration for generating realistic business personas based on theme/industry context
- Added persona caching system (personaCache) to optimize LLM usage and avoid repeated API calls
- Implemented comprehensive HubSpot property validation: ensureHubSpotProperties() checks and creates missing properties
- Added HubSpot association management for linking contacts, companies, deals, notes, and tickets
- Enhanced all CRM actions with authentic data generation: executeCreateContact, executeCreateCompany, executeCreateDeal, etc.
- Implemented property type detection and field type configuration for dynamic HubSpot property creation
- Added comprehensive error handling for both LLM failures (fallback to template data) and HubSpot API errors
- Enhanced job execution with theme/industry-specific prompts for realistic business scenarios
- Added variation system for cached persona data to ensure unique records while maintaining performance
- All 8 CRM actions fully implemented with proper API validation and association creation
- System ready for production with LLM-generated personas, HubSpot validation, and complete CRM lifecycle management
- Updated /api/simulation/start route to integrate with orchestrator: calls scheduleSimulationJob() after simulation creation
- Added outcome and acceleratorDays settings support with defaults (won, 30 days base cycle)
- Enhanced API response to include jobId, stepsCount, outcome, and acceleratorDays
- Removed execution disabled notes - simulation execution now fully active through orchestrator
- LLM models updated to gpt-5-nano (primary) with gpt-4.1-nano fallback for cost optimization
- Added industry-specific CSV template support with new Ecommerce Closed Won/Lost cycles
- Enhanced orchestrator with intelligent CSV template selection based on industry and outcome
- Implemented proper CSV parsing for quoted fields containing commas in action descriptions
- Ecommerce Won cycle: 21 steps spanning 85-90 days with post-sale onboarding
- Ecommerce Lost cycle: 20 steps spanning 68 days without fulfillment processes
- Fallback system ensures universal template is used for non-Ecommerce industries
- Implemented industry-specific win/loss rate system: E-commerce 75% win / 25% loss, other industries 50/50
- Enhanced outcome determination logic with explicit outcome request support and random assignment
- Job runner automatically started with server initialization for continuous simulation processing
- Verification testing confirms LLM integration, caching, CRM validation, API orchestrator integration, industry-specific templates, and win/loss rate distribution work correctly

**August 13, 2025** - Complete Unified Color Palette Implementation
- Applied comprehensive color palette update across ALL pages (excluding login/signup as requested)
- Background: Light Gray (#e8e8e8) with 30% opacity grid lines using rgba(176, 176, 176, 0.3) at 16px spacing
- Headers: Navy Blue (#1e3a5f) for all page titles, section headers, and important text
- Regular text: Black (#000000) for all body text, labels, and content
- Active buttons: Dark Red (#8b0000) background with white text
- Inactive/disabled buttons: Slate Gray (#6c7b7f) background with Sage Green (#9fb89f) text
- All containers match page background with consistent grid pattern overlay
- Updated pages: saas-selection, theme-selection, industry-selection, hubspot-setup, profile-page, progress-page, record-frequency, not-found
- All theme selection buttons, industry buttons, form inputs, and action buttons now follow unified color scheme
- Floating menu and audio player maintain consistent styling with updated color palette

**August 12, 2025** - OpenAI Integration Added
- Replaced n8n webhook with OpenAI API integration for AI strategy generation
- Primary model: gpt-5-nano with backup model: gpt-4.1-nano fallback
- Button changed to "Generate AI Strategy" - processes configuration with OpenAI
- Progress page now displays AI-generated CRM simulation strategies and business scenarios
- Status badges show processing states: processing, completed, failed
- AI responses stored in database with original configuration for reference
- Application flow: Login → Industry Selection → Theme Selection → SaaS Selection → Frequency Configuration → AI Strategy Generation → AI Results Display

**August 12, 2025** - Major Architecture Change: Simulation Execution Removed (Previously)
- Stripped out ALL simulation execution logic per user request
- Removed orchestrator, job processing, HubSpot integration, and execution-related database tables
- CSV timing specification system was built but no longer relevant since execution was removed
- HubSpot OAuth credentials requirement no longer applicable since execution was removed

**Previous: August 12, 2025** - Simulation Order Completely Rewritten Based on CSV Specification
- Replaced random job shuffling with precise 30-day sales cycle timing from universal_30day_timing_key CSV
- Implemented authentic business process: Day 0 (Contact+Company+Deal creation) → Day 1 (Deal enrichment) → Day 3 (Qualification+Note) → Day 5 (Presentation) → Day 7-8 (Ticket creation/update) → Day 10-30 (Progressive deal stages to Closed Won/Lost)
- Each simulation now follows realistic sales methodology with proper stage progression, associations, and business timing
- Fixed foreign key constraint errors by ensuring proper database record creation
- Enhanced logging to show exact simulation plan following CSV specifications

**August 10, 2025** - HubSpot API Compliance Audit & Comprehensive Fixes
- Fixed critical Notes timestamp format from milliseconds to ISO 8601 format to meet HubSpot API requirements
- Implemented comprehensive HubSpot-specific error handling with detailed validation, authentication, authorization, and rate limit error messages
- Added property validation for all HubSpot object types (contacts, companies, deals, tickets, notes) before API calls
- Enhanced error parsing to handle HubSpot API response formats and HTTP status codes properly
- Validated all property names against official HubSpot documentation (all were correct)
- Improved data integrity with email format validation, phone number validation, and required field checks
- Added comprehensive validation for numeric fields (employee count, revenue, deal amounts)
- Enhanced association creation with better error handling and validation

**January 7, 2025** - Complete Simulation Setup Flow Implemented
- Implemented comprehensive HubSpot validation system with prerequisite checking before simulation setup
- Updated theme selection with 16 specific popular franchises (Beatles, Star Wars, Zelda, Friends, etc.) instead of generic categories
- Created industry selection page with 12 business industry options (SaaS, Healthcare, Finance, etc.)
- Built WinAmp-style record frequency mixer page with vertical sliders for each HubSpot object type
- Added complete navigation flow: Theme Selection → Industry Selection → Record Frequency → Simulation
- Created equalizer-style interface for configuring data generation frequency (Contacts, Companies, Deals, Tickets, Notes with Calls/Tasks coming soon)
- Enhanced all pages with consistent Game Boy visual design and user feedback systems
- Maintained intelligent redirect flow ensuring HubSpot connection before simulation setup

## System Architecture

### Frontend Architecture
- **React with TypeScript** - Component-based UI using React 18 with full TypeScript support
- **Wouter routing** - Lightweight client-side routing for navigation between game screens
- **shadcn/ui components** - Consistent design system with Radix UI primitives and Tailwind CSS
- **Game Boy theming** - Custom CSS variables and styling to replicate authentic Game Boy aesthetics
- **TanStack Query** - Server state management for API calls and caching
- **Zustand** - Client-side state management with persistence for user sessions

### Backend Architecture
- **Express.js server** - RESTful API server with middleware for request handling
- **In-memory storage** - Current implementation uses Map-based storage with interface for future database integration
- **Session-based authentication** - Simple username/password authentication with session management
- **Modular route handling** - Separation of concerns with dedicated route handlers

### Data Models
- **Users** - Player profiles with username/password credentials
- **Sessions** - User state including HubSpot tokens, selected themes, industries, and simulation settings
- **Player Tiers** - Hierarchical progression system with credit limits (New Player: 150, Level 1: 325, Level 2: 500, Level 3: 1000, Level 4: Contact Us)

### Game Flow Architecture
- **Landing → Login/Registration** - Entry point with Game Boy start screen
- **Profile Management** - SaaS connection setup (currently HubSpot-focused)
- **Theme Selection** - Choose from music, movies, TV shows, or video games categories
- **Industry Selection** - Business context selection (salon, SaaS, law firm, etc.)
- **Frequency Selection** - Simulation timing options (1h, 4h, 1d, 1w, 1m, custom)
- **Simulation Setup** - Mixer board interface for configuring HubSpot object distributions

### Styling System
- **Tailwind CSS** - Utility-first CSS framework with custom Game Boy color palette
- **Press Start 2P font** - Authentic 8-bit typography
- **Custom CSS animations** - Screen effects like scanlines and blinking text
- **Responsive design** - Mobile-first approach with Game Boy console scaling

## External Dependencies

### Core Dependencies
- **Vite** - Build tool and development server with React plugin
- **Drizzle ORM** - Database toolkit configured for PostgreSQL with schema definitions
- **@neondatabase/serverless** - PostgreSQL database driver for serverless environments

### UI and Styling
- **Radix UI** - Accessible component primitives (dialogs, popovers, form controls)
- **class-variance-authority** - Component variant management
- **Tailwind CSS** - Utility-first CSS framework with custom theming

### State Management
- **TanStack React Query** - Server state management and caching
- **Zustand** - Lightweight state management with persistence middleware

### Development Tools
- **TypeScript** - Type safety across frontend, backend, and shared code
- **ESBuild** - Fast JavaScript bundler for production builds
- **Replit integrations** - Development environment optimizations and error overlays

### External Services
- **HubSpot API** - Primary CRM integration for data simulation
- **PostgreSQL** - Database backend (configured but using in-memory storage currently)
- **Express sessions** - Server-side session management

The architecture is designed to be modular and extensible, with clear separation between the game interface, business logic, and data persistence layers. The Game Boy aesthetic serves as both a unique user experience differentiator and a way to make CRM concepts more approachable through familiar gaming metaphors.