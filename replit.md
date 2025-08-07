# SimCRM - Game Boy CRM Simulation Platform

## Overview

SimCRM is a retro Game Boy-themed CRM simulation platform that gamifies business process management through HubSpot integration. The application provides an 8-bit styled interface where users can create and manage CRM data simulations across different business themes and industries. Users progress through player tiers with increasing credit limits and features, making CRM learning engaging through a nostalgic gaming experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**January 7, 2025** - Login Screen Design Completed
- Successfully implemented exact Game Boy-themed login interface matching user's reference image
- Features: faded grid background (30% opacity), rectangular console frame (400x300px), 4px rounded corners on all elements
- Uses "Player Name" and "Passcode" field labels as specified
- Login screen now perfectly matches authentic Nintendo Game Boy visual design

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