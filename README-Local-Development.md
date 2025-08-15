
# SimCRM - Local Development Setup

A retro Game Boy-themed CRM simulation platform that gamifies business process management through HubSpot integration.

## 🚀 Quick Start

1. **Extract this ZIP file** to your development directory
2. **Install dependencies**: `npm install`
3. **Setup environment**: Copy `.env.example` to `.env` and configure your API keys
4. **Setup database**: Run `npm run db:push` to create database schema
5. **Start development**: Run `npm run dev`
6. **Open browser**: Navigate to http://localhost:5000

## 📋 Prerequisites

- **Node.js 18+** (recommended: 20.x)
- **npm** (comes with Node.js)
- **PostgreSQL database** (local or cloud - Neon, Supabase, etc.)
- **HubSpot Private App Token** with CRM write permissions
- **OpenAI API Key** for AI-powered features

## 🔧 Environment Setup

Create a `.env` file in the root directory with these required variables:

```env
# Database (Required)
DATABASE_URL=postgresql://username:password@localhost:5432/simcrm

# API Keys (Required)
OPENAI_API_KEY=sk-your_openai_api_key_here
HUBSPOT_ACCESS_TOKEN=pat-na1-your_hubspot_token_here

# App Config
NODE_ENV=development
SESSION_SECRET=your_random_long_session_secret_here
PORT=5000
```

## 🎯 Key Features

- **Game Boy Aesthetic**: Authentic retro gaming UI with custom animations
- **HubSpot Integration**: Complete CRM data simulation and management
- **AI-Powered Generation**: OpenAI gpt-4o-mini for realistic business scenarios
- **Staggered Simulations**: Advanced timing control for realistic data creation
- **Rate Limiting**: Comprehensive API rate limit management
- **Real-time Progress**: Live simulation monitoring and progress tracking

## 🛠 Development Commands

```bash
# Development
npm run dev          # Start dev server (frontend + backend)
npm run build        # Build for production
npm start            # Start production server

# Database
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Drizzle Studio (database viewer)

# Utilities
npm run check        # TypeScript type checking
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
2. Navigate to Apps → Private Apps
3. Create a new Private App
4. Grant these scopes:
   - `crm.objects.contacts.write`
   - `crm.objects.companies.write` 
   - `crm.objects.deals.write`
   - `crm.objects.notes.write`
   - `crm.objects.tickets.write`
   - `crm.schemas.contacts.write`
   - `crm.schemas.companies.write`
   - `crm.schemas.deals.write`
5. Copy the access token (starts with `pat-na1-`)

### OpenAI API Key
1. Visit https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

### Database Setup Options

#### Option 1: Local PostgreSQL
1. Install PostgreSQL on your machine
2. Create a new database: `createdb simcrm`
3. Use connection string: `postgresql://username:password@localhost:5432/simcrm`

#### Option 2: Cloud Database (Recommended)
**Neon (Free tier available):**
1. Sign up at https://neon.tech
2. Create a new project
3. Copy the connection string

**Supabase (Free tier available):**
1. Sign up at https://supabase.com
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string

## 🎮 How It Works

1. **User Journey**: Login → Profile Setup → HubSpot Connection → Theme Selection → Industry Selection → Record Frequency → AI Strategy → Simulation Execution
2. **AI Generation**: Uses OpenAI gpt-4o-mini to create realistic business personas and scenarios
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

### Database Issues
- Verify DATABASE_URL format: `postgresql://user:pass@host:port/dbname`
- Ensure database exists and is accessible
- Run `npm run db:push` to sync schema
- Check database permissions

### API Key Issues
- Verify HubSpot token has correct scopes
- Check OpenAI API key is valid and has credits
- Ensure tokens are correctly set in `.env` file
- Test API connectivity

### Port Conflicts
- Default port is 5000
- Change PORT in `.env` if needed
- Check no other services are using the port
- Kill existing processes: `lsof -ti:5000 | xargs kill -9`

### Build Issues
- Delete `node_modules` and run `npm install` again
- Clear npm cache: `npm cache clean --force`
- Check Node.js version: `node --version` (should be 18+)

## 🚀 Production Deployment

For production deployment:
1. Set `NODE_ENV=production` in `.env`
2. Use production database URL
3. Generate secure session secret (32+ random characters)
4. Run `npm run build` to build for production
5. Use `npm start` to start production server
6. Consider using PM2 or similar process manager
7. Setup proper logging and monitoring
8. Configure reverse proxy (nginx) if needed

## 📊 Database Schema

The application uses Drizzle ORM with PostgreSQL. Key tables:
- `users` - User accounts and profiles
- `sessions` - User sessions
- `simulations` - Simulation configurations and results
- `jobs` - Background job tracking
- `job_steps` - Individual simulation steps
- `api_tokens` - HubSpot API tokens

## 🔒 Security Considerations

- Never commit `.env` file to version control
- Use strong, unique session secrets
- Regularly rotate API keys
- Implement rate limiting in production
- Use HTTPS in production
- Validate all user inputs
- Sanitize database queries

## 📞 Support & Development

This is a complete, self-contained package with all source code included. 

**Key Development Areas:**
- AI prompt engineering in `server/llm-guardrails.ts`
- HubSpot integration in `server/orchestrator.ts`
- UI components in `client/src/components/`
- Game Boy styling in `client/src/index.css`

**Common Customizations:**
- Add new CRM object types
- Modify AI generation prompts
- Create new simulation themes
- Add industry-specific scenarios
- Customize Game Boy aesthetics

---

**SimCRM** - Making CRM management fun through retro gaming aesthetics and intelligent automation.

Built with ❤️ for the CRM community.
