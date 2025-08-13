# SimCRM - Game Boy CRM Simulation Platform

## Overview
SimCRM is a retro Game Boy-themed CRM simulation platform that gamifies business process management through HubSpot integration. The application provides an 8-bit styled interface where users can create and manage CRM data simulations across different business themes and industries. Users progress through player tiers with increasing credit limits and features, making CRM learning engaging through a nostalgic gaming experience. The project's vision is to make complex CRM concepts approachable and engaging through familiar gaming metaphors, offering a unique user experience differentiator.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

**August 13, 2025** - Comprehensive Association Type Coverage and Validation System  
- Implemented centralized association mapping for all supported HubSpot object relationships
- **Complete Coverage**: All major CRM objects (contacts, companies, deals, tickets, notes, calls, emails, meetings, tasks, products, line_items, quotes)  
- **Centralized Mapping**: `HUBSPOT_ASSOCIATION_MAP` with all supported association type IDs (350+ relationships)
- **Pre-validation System**: `validateAssociation()` function prevents unsupported association attempts
- **Enhanced Error Handling**: Actionable error messages with supported alternatives for failed associations
- **Bidirectional Support**: Handles both directions of relationships with proper type ID resolution
- **CSV Integration**: All associations in CSV imports resolve to known association types with validation
- **Database Caching**: Leverages existing per-user caching infrastructure to minimize API calls
- **Test Framework**: `/api/test/association-validation` endpoint with comprehensive validation scenarios
- **Documentation**: Complete association coverage with test cases and validation examples
- **User Request Handled**: Note ↔ Ticket validation shows tickets→notes supported (Type ID: 225), notes→tickets unsupported
- **Acceptance Criteria Met**: Centralized mapping, validation with crisp errors, unknown combos fail gracefully
- Association system ensures reliable CRM relationship management with comprehensive validation and error handling

**August 13, 2025** - Comprehensive Custom Property Creation and Option Management System
- Implemented comprehensive custom property creation system for all HubSpot property types
- **Property Type Support**: text, number, date, bool, single-select, multi-select with intelligent type detection
- **Automatic Property Creation**: Missing properties automatically created when first referenced in record data
- **Option Management**: Missing select options automatically added to existing enumeration properties
- **Type Detection Logic**: Analyzes property names and data values to determine appropriate HubSpot types
- **Data Validation**: Comprehensive validation with type coercion (string-to-number, string-to-boolean, date parsing)
- **Constraint Enforcement**: String length limits, numeric validation, date format validation, boolean conversion
- **Enhanced Property Configuration**: Currency display hints, multi-select support, proper field type mapping
- **Graceful Error Handling**: Non-blocking failures with detailed logging and user feedback
- **Integration with Record Creation**: Enhanced Contact, Company, and Deal creation with automatic property management
- **Test Framework**: `/api/test/property-creation` endpoint demonstrating all property types and validation
- **Documentation**: Comprehensive test documentation with examples and validation scenarios
- **Acceptance Criteria Met**: New properties auto-created, missing options added, constraints enforced with coercion
- Custom property system ensures seamless CRM integration with zero manual property management required

**August 13, 2025** - Owner Assignment System with Email-to-ID Resolution

## System Architecture

### UI/UX Decisions
The platform features a distinctive Game Boy aesthetic, implemented through:
- **Game Boy Theming**: Custom CSS variables, `Press Start 2P` font, and custom CSS animations (scanlines, blinking text) replicate authentic Game Boy visuals.
- **Color Palette**: A comprehensive unified color palette is applied across all pages (excluding login/signup). This includes specific colors for backgrounds, headers, text, active/inactive buttons, and container elements, maintaining consistency.
- **Responsive Design**: A mobile-first approach ensures optimal display across devices, with Game Boy console scaling.
- **Interactive Elements**: Features like a WinAmp-style record frequency mixer page with vertical sliders and an equalizer-style interface enhance user interaction. Information tooltips provide clarity on functionalities like the "Time Span" dropdown.

### Technical Implementations
- **Frontend**: Built with React 18 and TypeScript for component-based UI, utilizing Wouter for routing, shadcn/ui for a consistent design system (based on Radix UI and Tailwind CSS), TanStack Query for server state management, and Zustand for client-side state management with persistence.
- **Backend**: An Express.js server provides a RESTful API with modular route handling and session-based authentication. Currently uses in-memory storage, with an interface for future database integration.
- **Data Models**: Includes `Users` for player profiles, `Sessions` for user state (HubSpot tokens, selected themes, industries, simulation settings), and `Player Tiers` defining hierarchical progression with increasing credit limits.
- **Simulation Logic**: The system now focuses solely on generating AI-powered CRM simulation strategies and business scenarios, removing all previous simulation execution logic. It supports comprehensive custom property creation for all HubSpot property types (text, number, date, bool, single-select, multi-select) with intelligent type detection, automatic property creation, and option management. It also includes an owner assignment system that resolves owner emails to HubSpot IDs and a pipeline/stage validation system for deal creation/updates, caching HubSpot data to minimize API calls.

### Feature Specifications
- **Simulation Setup Flow**: Users navigate through Landing → Login/Registration → Profile Management (HubSpot connection) → Theme Selection (16 specific franchises) → Industry Selection (12 business industries) → Record Frequency (mixer board for HubSpot object distribution) → AI Strategy Generation → AI Results Display.
- **AI Strategy Generation**: Integrates with OpenAI (gpt-5-nano with gpt-4.1-nano fallback) to generate CRM simulation strategies and business scenarios, displaying processing states (processing, completed, failed) and storing responses.
- **Data Validation & Error Handling**: Comprehensive validation is implemented for HubSpot object types, including email format, phone number, required fields, and numeric values. HubSpot-specific error handling provides detailed messages for validation, authentication, authorization, and rate limit errors. Invalid data combinations are marked as `failed_non_retryable` with clear feedback.

## External Dependencies

### Core Dependencies
- **Vite**: Build tool and development server.
- **Drizzle ORM**: Database toolkit (configured for PostgreSQL).
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
- **PostgreSQL**: Configured database backend (currently uses in-memory storage).
- **OpenAI API**: Used for AI strategy and scenario generation.
- **Express sessions**: For server-side session management.