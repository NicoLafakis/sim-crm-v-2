# SimCRM Local Development Setup

## Prerequisites

- Node.js 18+ (recommended: 20.x)
- npm or yarn
- PostgreSQL database (local or cloud)

## Installation Steps

1. **Extract the ZIP file** to your desired directory
2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Database Setup**:
   - Create a PostgreSQL database
   - Copy `.env.example` to `.env` and update with your database credentials:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/simcrm
   OPENAI_API_KEY=your_openai_api_key_here
   HUBSPOT_ACCESS_TOKEN=your_hubspot_token_here
   SESSION_SECRET=your_random_session_secret
   NODE_ENV=development
   ```

4. **Database Migration**:
   ```bash
   npm run db:push
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

6. **Access the Application**:
   - Open http://localhost:5000 in your browser
   - The app serves both frontend and backend on the same port

## Project Structure

```
simcrm/
├── client/           # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   └── lib/         # Utilities and configurations
├── server/           # Express backend
│   ├── routes.ts       # API endpoints
│   ├── storage.ts      # Database operations
│   ├── orchestrator.ts # Simulation logic
│   └── hubspot-service.ts # HubSpot API integration
├── shared/           # Shared types and schemas
│   └── schema.ts       # Database schema and types
└── package.json      # Dependencies and scripts
```

## Key Features

- **Game Boy Themed UI**: Retro gaming aesthetic with custom CSS animations
- **HubSpot Integration**: Full CRM data simulation and management
- **OpenAI Integration**: AI-powered strategy generation (gpt-5-nano)
- **PostgreSQL Database**: Persistent data storage with Drizzle ORM
- **Real-time Simulations**: Staggered data creation with rate limiting

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio (database viewer)

## Environment Variables Required

1. **DATABASE_URL** - PostgreSQL connection string
2. **OPENAI_API_KEY** - OpenAI API key for AI features
3. **HUBSPOT_ACCESS_TOKEN** - HubSpot private app token
4. **SESSION_SECRET** - Random string for session security

## Getting API Keys

### HubSpot Token
1. Go to HubSpot Developer Account
2. Create a Private App
3. Grant required scopes: `crm.objects.contacts.write`, `crm.objects.companies.write`, `crm.objects.deals.write`, etc.
4. Copy the access token

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

## Troubleshooting

- **Database Connection Issues**: Verify DATABASE_URL format and credentials
- **Port Already in Use**: Change port in `server/index.ts` if needed
- **Missing Dependencies**: Run `npm install` again
- **Database Schema Issues**: Run `npm run db:push` to sync schema

## Production Deployment

For production deployment:
1. Set `NODE_ENV=production`
2. Update database URL to production instance
3. Use proper session secret (not the example one)
4. Consider using PM2 or similar process manager

## Support

Refer to the main README.md for detailed feature documentation and architecture information.