import type { Express } from "express";
import { eq, and, sql, or, inArray } from 'drizzle-orm';
import { db } from "./db";
import { users, sessions, simulations, jobs, jobSteps, apiTokens, insertUserSchema, insertSessionSchema } from "../shared/schema";
import type { User, Session, Simulation, InsertSimulation, InsertUser, InsertSession } from "../shared/schema";
import { DatabaseStorage } from "./storage";
import { scheduleSimulationJob } from './orchestrator';
import { storage } from './storage';
import { rateLimiter } from './rate-limiter';
import { validateDataOrThrow } from './validation';
import { fetchAndCacheOwners } from './orchestrator';

const storage = new DatabaseStorage();

export function registerRoutes(app: Express) {
  
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      
      // Create initial session
      const session = await storage.createSession({
        userId: user.id,
        isActive: true
      });
      
      res.json({ user: { id: user.id, username: user.username }, sessionId: session.id });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Update or create session
      let session = await storage.getSession(user.id);
      if (!session) {
        session = await storage.createSession({
          userId: user.id,
          isActive: true
        });
      }
      
      res.json({ user: { id: user.id, username: user.username }, sessionId: session.id });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User routes
  app.get("/api/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ id: user.id, username: user.username, playerTier: user.playerTier });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/user/:userId/simulations", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const userSimulations = await storage.getSimulationsByUser(userId);
      res.json(userSimulations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/user/:userId/password", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { currentPassword, newPassword } = req.body;
      
      const user = await storage.getUserById(userId);
      if (!user || user.password !== currentPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      const updatedUser = await storage.updateUser(userId, { password: newPassword });
      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/user/:userId/tokens", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const tokens = await storage.getUserTokens(userId);
      res.json(tokens);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/user/:userId/tokens", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { service, token } = req.body;
      
      const newToken = await storage.createUserToken({
        userId,
        service,
        accessToken: token,
        isActive: true
      });
      
      res.json(newToken);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/user/:userId/tokens/:tokenId", async (req, res) => {
    try {
      const tokenId = parseInt(req.params.tokenId);
      await storage.deleteUserToken(tokenId);
      res.json({ message: "Token deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Session routes
  app.get("/api/session/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const session = await storage.getSession(userId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/session/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const updateData = req.body;
      
      // If updating with a HubSpot token, sync owners automatically
      if (updateData.hubspotToken) {
        try {
          await fetchAndCacheOwners(updateData.hubspotToken);
          console.log(`HUBSPOT API: Owners synced for user ${userId}`);
        } catch (error) {
          console.warn(`HUBSPOT API: Failed to sync owners for user ${userId}:`, error);
          // Continue with session update even if owner sync fails
        }
      }
      
      const updatedSession = await storage.updateSession(userId, updateData);
      res.json(updatedSession);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // HubSpot validation
  app.post("/api/validate-hubspot-token", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ valid: false, message: "Token is required" });
      }
      
      // Simple validation - check if token has correct format
      if (token.startsWith('pat-na1-') && token.length > 20) {
        res.json({ valid: true, message: "Token format is valid" });
      } else {
        res.json({ valid: false, message: "Invalid token format" });
      }
    } catch (error: any) {
      res.status(500).json({ valid: false, message: error.message });
    }
  });

  app.get("/api/hubspot/status/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const session = await storage.getSession(userId);
      
      const connected = !!(session?.hubspotToken);
      res.json({ 
        connected, 
        hasToken: connected,
        status: connected ? 'connected' : 'disconnected'
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Helper function to format theme and industry names for simulation titles
  const formatSimulationName = (theme: string, industry: string): string => {
    // Theme name mappings - these match what's used in theme-selection.tsx
    const themeNames: Record<string, string> = {
      // Music themes
      'Beatles': 'Beatles',
      'Madonna': 'Madonna', 
      'Drake': 'Drake',
      'Daft Punk': 'Daft Punk',
      // Movie themes
      'Star Wars': 'Star Wars',
      'Marvel': 'Marvel',
      'Harry Potter': 'Harry Potter',
      'Fast & Furious': 'Fast & Furious',
      // Video Game themes
      'Zelda': 'Zelda',
      'Red Dead Redemption': 'Red Dead Redemption',
      'Megaman': 'Megaman',
      'Final Fantasy': 'Final Fantasy',
      // TV Show themes
      'Friends': 'Friends',
      'Game of Thrones': 'Game of Thrones',
      'The Office': 'The Office',
      'Breaking Bad': 'Breaking Bad',
      // Other themes
      'Lord of the Rings': 'Lord of the Rings',
      'Game Boy': 'Game Boy',
      'Pokemon': 'Pokemon',
      'generic': 'Generic'
    };

    // Industry name mappings - these match what's used in industry-selection.tsx
    const industryNames: Record<string, string> = {
      'saas': 'SaaS',
      'ecommerce': 'E-commerce',
      'healthcare': 'Healthcare',
      'finance': 'Finance',
      'education': 'Education',
      'realestate': 'Real Estate',
      'consulting': 'Consulting',
      'manufacturing': 'Manufacturing',
      'retail': 'Retail',
      'nonprofit': 'Non-Profit',
      'salon': 'Salon/Spa',
      'lawfirm': 'Law Firm',
      'business': 'Business'
    };

    const formattedTheme = themeNames[theme] || theme;
    const formattedIndustry = industryNames[industry] || industry;
    
    return `${formattedIndustry} ${formattedTheme} Simulation`;
  };

  // Simulation routes
  app.post("/api/simulation/start", async (req, res) => {
    try {
      const { userId, settings } = req.body;
      
      console.log('Starting simulation with settings:', {
        theme: settings.theme,
        industry: settings.industry,
        frequency: settings.frequency
      });
      
      // Create simulation record with properly formatted name
      const formattedName = formatSimulationName(settings.theme, settings.industry);
      console.log('Generated simulation name:', formattedName);
      
      const simulationData: InsertSimulation = {
        userId: userId,
        name: formattedName,
        theme: settings.theme,
        industry: settings.industry,
        frequency: settings.frequency || 'medium',
        config: settings,
        status: 'active',
        startedAt: new Date(),
        creditsUsed: 0
      };

      const simulation = await storage.createSimulation(simulationData);

      console.log('Simulation started with orchestrator job scheduling:', {
        simulationId: simulation.id,
        theme: settings.theme,
        industry: settings.industry,
        acceleratorDays: settings.duration_days
      });

      // Determine outcome and accelerator days
      const outcome = Math.random() < 0.5 ? 'won' : 'lost';
      const acceleratorDays = settings.duration_days || 0.5;
      
      // Schedule simulation job with proper parameters
      const { jobId, stepsCount } = await scheduleSimulationJob(
        simulation, 
        outcome, 
        acceleratorDays,
        1, // contactSeq
        new Date() // setStartAt
      );

      // Get job metadata to extract CSV template information
      const job = await storage.getJobById(jobId);
      const jobMetadata = job?.metadata as any;
      
      // Update simulation with job info and CSV template details
      await storage.updateSimulation(simulation.id, {
        status: 'processing',
        config: { 
          ...settings, 
          outcome, 
          acceleratorDays, 
          jobId, 
          stepsCount,
          csvTemplate: jobMetadata?.csvSource || 'unknown',
          usingIndustrySpecificTemplate: jobMetadata?.usingIndustrySpecificTemplate || false,
          templateType: jobMetadata?.templateType || 'universal'
        }
      });

      console.log('Simulation job scheduled:', {
        simulationId: simulation.id,
        jobId,
        stepsCount,
        outcome,
        acceleratorDays
      });

      res.json({ 
        status: "processing",
        message: "Simulation started with job scheduling",
        simulationId: simulation.id,
        jobId,
        stepsCount,
        outcome,
        acceleratorDays
      });
      
    } catch (error) {
      console.error("Simulation start error:", error);
      res.status(500).json({ message: "Failed to start simulation" });
    }
  });

  app.delete("/api/simulation/:simulationId", async (req, res) => {
    try {
      const simulationId = parseInt(req.params.simulationId);
      await storage.deleteSimulation(simulationId);
      res.json({ message: "Simulation deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/simulation/:simulationId/pause", async (req, res) => {
    try {
      const simulationId = parseInt(req.params.simulationId);
      
      // Update simulation status to paused
      await storage.updateSimulation(simulationId, { status: 'paused' });
      
      // Update all pending job steps to paused status
      await db.update(jobSteps)
        .set({ status: 'paused' })
        .where(and(
          eq(jobSteps.status, 'pending'),
          inArray(jobSteps.jobId, 
            db.select({ id: jobs.id })
              .from(jobs)
              .where(eq(jobs.simulationId, simulationId))
          )
        ));
      
      res.json({ 
        status: "paused",
        message: "Simulation paused successfully"
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/simulation/:simulationId/resume", async (req, res) => {
    try {
      const simulationId = parseInt(req.params.simulationId);
      
      // Update simulation status to processing
      await storage.updateSimulation(simulationId, { status: 'processing' });
      
      // Update all paused job steps back to pending status
      await db.update(jobSteps)
        .set({ status: 'pending' })
        .where(and(
          eq(jobSteps.status, 'paused'),
          inArray(jobSteps.jobId, 
            db.select({ id: jobs.id })
              .from(jobs)
              .where(eq(jobs.simulationId, simulationId))
          )
        ));
      
      res.json({ 
        status: "processing",
        message: "Simulation resumed successfully"
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/simulation/:simulationId/stop", async (req, res) => {
    try {
      const simulationId = parseInt(req.params.simulationId);
      
      // Update simulation status to stopped
      await storage.updateSimulation(simulationId, { 
        status: 'stopped',
        completedAt: new Date()
      });
      
      // Cancel all pending/paused job steps
      await db.update(jobSteps)
        .set({ status: 'cancelled' })
        .where(and(
          or(eq(jobSteps.status, 'pending'), eq(jobSteps.status, 'paused')),
          inArray(jobSteps.jobId, 
            db.select({ id: jobs.id })
              .from(jobs)
              .where(eq(jobs.simulationId, simulationId))
          )
        ));
      
      res.json({ 
        status: "stopped",
        message: "Simulation stopped successfully"
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Live progress tracking endpoint
  app.get('/api/simulation/progress', async (req, res) => {
    try {
      // Get all processing simulations with their job progress
      const progressData = await db.select({
        simulationId: simulations.id,
        jobId: jobs.id,
        completedSteps: sql<number>`count(case when ${jobSteps.status} = 'completed' then 1 end)`,
        processingSteps: sql<number>`count(case when ${jobSteps.status} = 'processing' then 1 end)`,
        failedSteps: sql<number>`count(case when ${jobSteps.status} = 'failed' then 1 end)`,
        totalSteps: sql<number>`count(*)`,
        nextStepTime: sql<string>`min(case when ${jobSteps.status} = 'pending' then ${jobSteps.scheduledAt} end)`
      })
      .from(simulations)
      .innerJoin(jobs, eq(jobs.simulationId, simulations.id))
      .innerJoin(jobSteps, eq(jobSteps.jobId, jobs.id))
      .where(eq(simulations.status, 'processing'))
      .groupBy(simulations.id, jobs.id);

      res.json(progressData);
    } catch (error) {
      console.error('Error getting simulation progress:', error);
      res.status(500).json({ error: 'Failed to get progress' });
    }
  });

  // CRM CRUD endpoints for direct record creation/updates  
  app.post('/api/crm/contacts', async (req, res) => {
    try {
      const { userId, data } = req.body;
      const session = await storage.getSession(userId);
      
      if (!session?.hubspotToken) {
        return res.status(400).json({ error: 'HubSpot token not found' });
      }

      // Import orchestrator functions dynamically
      const { executeCreateContact } = require('./orchestrator');
      // Execute without a job context; executeCreateContact handles optional step
      const result = await executeCreateContact(data, session.hubspotToken);
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/crm/companies', async (req, res) => {
    try {
      const { userId, data } = req.body;
      const session = await storage.getSession(userId);
      
      if (!session?.hubspotToken) {
        return res.status(400).json({ error: 'HubSpot token not found' });
      }

      // Import orchestrator functions dynamically
      const { executeCreateCompany } = require('./orchestrator');
      // Execute without a job context; executeCreateCompany handles optional step
      const result = await executeCreateCompany(data, session.hubspotToken);
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/crm/deals', async (_req, res) => {
    return res.status(400).json({ error: 'Direct deal creation is unsupported. Use the simulation flow.' });
  });

  app.post('/api/crm/tickets', async (_req, res) => {
    return res.status(400).json({ error: 'Direct ticket creation is unsupported. Use the simulation flow.' });
  });

  app.post('/api/crm/notes', async (req, res) => {
    try {
      const { userId, data } = req.body;
      const session = await storage.getSession(userId);
      
      if (!session?.hubspotToken) {
        return res.status(400).json({ error: 'HubSpot token not found' });
      }

      const { executeCreateNote } = require('./orchestrator');
      const result = await executeCreateNote(data, session.hubspotToken, { jobId: 0 });
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/crm/deals/:dealId', async (req, res) => {
    try {
      const { userId, data } = req.body;
      const { dealId } = req.params;
      const session = await storage.getSession(userId);
      
      if (!session?.hubspotToken) {
        return res.status(400).json({ error: 'HubSpot token not found' });
      }

      const { executeUpdateDeal } = require('./orchestrator');
      const result = await executeUpdateDeal(data, session.hubspotToken, { 
        jobId: 0, 
        recordIdTpl: dealId 
      });
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/crm/tickets/:ticketId', async (req, res) => {
    try {
      const { userId, data } = req.body;
      const { ticketId } = req.params;
      const session = await storage.getSession(userId);
      
      if (!session?.hubspotToken) {
        return res.status(400).json({ error: 'HubSpot token not found' });
      }

      const { executeUpdateTicket } = require('./orchestrator');
      const result = await executeUpdateTicket(data, session.hubspotToken, { 
        jobId: 0, 
        recordIdTpl: ticketId 
      });
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Test endpoint for pipeline validation
  app.get("/api/test/pipeline-validation", async (req, res) => {
    try {
      const { testPipelineValidation } = await import('./test-pipeline-validation');
      
      // Get user session to find HubSpot token
      const session = await storage.getSession(1); // Test with user 1
      if (!session?.hubspotToken) {
        return res.status(400).json({ 
          success: false, 
          message: "No HubSpot token found. Please connect HubSpot account first." 
        });
      }
      
      const result = await testPipelineValidation(session.hubspotToken, 1);
      res.json(result);
      
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message,
        message: "Pipeline validation test failed"
      });
    }
  });

  return app;
}