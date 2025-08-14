import type { Express } from "express";
import { eq, and, sql } from 'drizzle-orm';
import { db } from "./db";
import { users, sessions, simulations, jobs, jobSteps, apiTokens, insertUserSchema, insertSessionSchema } from "../shared/schema";
import type { User, Session, Simulation, InsertSimulation, InsertUser, InsertSession } from "../shared/schema";
import { DatabaseStorage } from "./storage";
import { scheduleSimulationJob } from './orchestrator';

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
      const userId = parseInt(req.params.userId);
      const updates = req.body;
      
      const session = await storage.updateSession(userId, updates);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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

  // Simulation routes
  app.post("/api/simulation/start", async (req, res) => {
    try {
      const { userId, settings } = req.body;
      
      // Create simulation record
      const simulationData: InsertSimulation = {
        userId: userId,
        name: `${settings.theme} - ${settings.industry} Simulation`,
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
        
      // Update simulation with job info
      await storage.updateSimulation(simulation.id, {
        status: 'processing',
        config: { ...settings, outcome, acceleratorDays, jobId, stepsCount }
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
      const result = await executeCreateContact(data, session.hubspotToken, { jobId: 0 });
      
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

      const { executeCreateCompany } = require('./orchestrator');
      const result = await executeCreateCompany(data, session.hubspotToken, { jobId: 0 });
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/crm/deals', async (req, res) => {
    try {
      const { userId, data } = req.body;
      const session = await storage.getSession(userId);
      
      if (!session?.hubspotToken) {
        return res.status(400).json({ error: 'HubSpot token not found' });
      }

      const { executeCreateDeal } = require('./orchestrator');
      const result = await executeCreateDeal(data, session.hubspotToken, { jobId: 0 });
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/crm/tickets', async (req, res) => {
    try {
      const { userId, data } = req.body;
      const session = await storage.getSession(userId);
      
      if (!session?.hubspotToken) {
        return res.status(400).json({ error: 'HubSpot token not found' });
      }

      const { executeCreateTicket } = require('./orchestrator');
      const result = await executeCreateTicket(data, session.hubspotToken, { jobId: 0 });
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
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