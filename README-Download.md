# SimCRM - Game Boy CRM Simulation Platform

A retro Game Boy-themed CRM simulation platform that gamifies business process management through HubSpot integration. This downloadable package contains the complete source code for local development.

## 🚀 Quick Start

1. **Extract this ZIP file** to your development directory
2. **Install dependencies**: `npm install`
3. **Setup environment**: Copy `.env.example` to `.env` and configure your API keys
4. **Setup database**: Run `npm run db:push` to create database schema
5. **Start development**: Run `npm run dev`
6. **Open browser**: Navigate to http://localhost:5000

## 📋 Prerequisites

- **Node.js 18+** (recommended: 20.x)
- **PostgreSQL database** (local or cloud - Neon, Supabase, etc.)
- **HubSpot Private App Token** with CRM write permissions
- **OpenAI API Key** for AI-powered features

## 🔧 Environment Setup

Create a `.env` file with these required variables:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/simcrm

# API Keys
OPENAI_API_KEY=sk-your_openai_api_key_here
HUBSPOT_ACCESS_TOKEN=pat-na1-your_hubspot_token_here

# App Config
NODE_ENV=development
SESSION_SECRET=your_random_long_session_secret_here
```

## 🎯 Key Features

- **Game Boy Aesthetic**: Authentic retro gaming UI with custom animations
- **HubSpot Integration**: Complete CRM data simulation and management
- **AI-Powered Generation**: OpenAI gpt-5-nano for realistic business scenarios
- **Staggered Simulations**: Advanced timing control for realistic data creation
- **Rate Limiting**: Comprehensive API rate limit management
- **Real-time Progress**: Live simulation monitoring and progress tracking

## 🛠 Development Commands

```bash
# Development
npm run dev          # Start dev server (frontend + backend)
npm run build        # Build for production

# Database
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Drizzle Studio (database viewer)

# Utilities
npm run clean        # Clean build artifacts
```

## 📁 Project Structure

```
simcrm/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── lib/            # Utilities and configurations
│   │   └── App.tsx         # Main app component
├── server/                 # Express backend
│   ├── routes.ts           # API endpoints
│   ├── storage.ts          # Database operations
│   ├── orchestrator.ts     # Simulation orchestration
│   ├── hubspot-service.ts  # HubSpot API integration
│   ├── llm-guardrails.ts   # OpenAI integration & validation
│   └── rate-limiter.ts     # API rate limiting
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Database schema (Drizzle ORM)
└── package.json           # Dependencies and scripts
```

## 🔐 Getting API Keys

### HubSpot Private App Token
1. Go to your HubSpot Developer Account
2. Create a new Private App
3. Grant these scopes:
   - `crm.objects.contacts.write`
   - `crm.objects.companies.write` 
   - `crm.objects.deals.write`
   - `crm.objects.notes.write`
   - `crm.objects.tickets.write`
   - `crm.schemas.contacts.write`
   - `crm.schemas.companies.write`
   - `crm.schemas.deals.write`
4. Copy the access token (starts with `pat-na1-`)

### OpenAI API Key
1. Visit https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

## 🎮 How It Works

1. **User Journey**: Login → Profile Setup → HubSpot Connection → Theme Selection → Industry Selection → Record Frequency → AI Strategy → Simulation Execution
2. **AI Generation**: Uses OpenAI gpt-5-nano to create realistic business personas and scenarios
3. **Data Creation**: Generates authentic CRM records (contacts, companies, deals, notes, tickets) with proper associations
4. **Rate Limiting**: Intelligent API rate limiting with exponential backoff and retry logic
5. **Progress Tracking**: Real-time monitoring of simulation progress with detailed logging

## 🔍 Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, Wouter (routing)
- **Backend**: Express.js, TypeScript, Drizzle ORM
- **Database**: PostgreSQL
- **External APIs**: HubSpot CRM API, OpenAI API
- **State Management**: TanStack Query, Zustand
- **Development**: Vite, ESBuild

## 🐛 Troubleshooting

**Database Issues**:
- Verify DATABASE_URL format: `postgresql://user:pass@host:port/dbname`
- Ensure database exists and is accessible
- Run `npm run db:push` to sync schema

**API Key Issues**:
- Verify HubSpot token has correct scopes
- Check OpenAI API key is valid and has credits
- Ensure tokens are correctly set in `.env` file

**Port Conflicts**:
- Default port is 5000
- Change in `server/index.ts` if needed
- Check no other services are using the port

## 📄 Documentation

- `LOCAL_SETUP.md` - Detailed setup instructions
- `IMPLEMENTATION.md` - Technical implementation details
- `replit.md` - Project overview and architecture

## 🚀 Production Deployment

For production deployment:
1. Set `NODE_ENV=production`
2. Use production database URL
3. Generate secure session secret
4. Consider using PM2 or Docker
5. Setup proper logging and monitoring

## 📞 Support

This is a complete, self-contained package. All source code, configurations, and documentation are included for local development and customization.

---

**SimCRM** - Making CRM management fun through retro gaming aesthetics and intelligent automation.