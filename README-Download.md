# SimCRM - Local Development Setup

## Download Instructions

Your complete SimCRM project is available for download as `simcrm-download.zip` in the root directory.

## Local Setup

1. **Download the zip file** from this Replit workspace
2. **Extract** the contents to your local machine
3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Set up environment variables**:
   Create a `.env` file in the root directory with:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   OPENAI_API_KEY=your_openai_api_key
   HUBSPOT_PRIVATE_APP_TOKEN=your_hubspot_token
   ```

5. **Set up the database**:
   ```bash
   npm run db:push
   ```

6. **Start the development server**:
   ```bash
   npm run dev
   ```

## Features Included

✅ **Complete CRM Simulation System**
- HubSpot API integration with full validation
- OpenAI-powered realistic data generation using gpt-5-nano
- Game Boy themed UI with retro styling
- Comprehensive rate limiting and error handling

✅ **Fixed Issues**
- Removed broken validation that was blocking record creation
- Enhanced LLM prompts for complete data generation
- Fixed property creation optimization to avoid conflicts
- Added proper data enrichment for required fields

✅ **Database Schema**
- Full Drizzle ORM setup
- PostgreSQL integration
- Complete session management

✅ **Frontend**
- React 18 with TypeScript
- Wouter routing
- shadcn/ui components
- TanStack Query for state management

## Recent Fixes (August 2025)

- **Fixed Empty Records Issue**: Enhanced LLM prompts to generate complete contact/company data
- **Validation System**: Removed problematic strict validation that expected wrong data structure
- **Property Creation**: Optimized to avoid 409 conflicts with existing HubSpot properties
- **Record Creation**: Successfully creating contacts, companies, deals, and other CRM objects

## Architecture

The project follows a full-stack TypeScript architecture:
- **Frontend**: `/client` - React application
- **Backend**: `/server` - Express.js API
- **Shared**: `/shared` - Common types and schemas
- **Database**: Drizzle ORM with PostgreSQL

## Support

If you encounter any issues during local setup, refer to the comprehensive documentation in `replit.md` for detailed implementation notes and troubleshooting guidance.