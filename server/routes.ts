import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertSessionSchema } from "@shared/schema";
import { orchestrator } from "./orchestrator";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Get or create session
      let session = await storage.getSession(user.id);
      if (!session) {
        session = await storage.createSession({
          userId: user.id,
          hubspotToken: null,
          selectedTheme: null,
          selectedIndustry: null,
          selectedFrequency: null,
          simulationConfig: null
        });
      }
      
      res.json({ user, session });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      const session = await storage.createSession({
        userId: user.id,
        hubspotToken: null,
        selectedTheme: null,
        selectedIndustry: null,
        selectedFrequency: null,
        simulationConfig: null
      });
      
      res.json({ user, session });
    } catch (error) {
      console.error("Registration error:", error);
      
      // Handle Zod validation errors
      if (error instanceof Error && error.name === 'ZodError') {
        const zodError = error as any;
        const passwordError = zodError.issues?.find((issue: any) => issue.path.includes('password'));
        if (passwordError) {
          return res.status(400).json({ message: passwordError.message });
        }
        return res.status(400).json({ message: "Invalid registration data" });
      }
      
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // HubSpot validation route
  app.get("/api/hubspot/status/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const session = await storage.getSession(userId);
      const apiToken = await storage.getApiTokenByService(userId, 'hubspot');
      
      const hasSessionToken = !!session?.hubspotToken;
      const hasApiToken = !!apiToken?.accessToken;
      
      res.json({
        connected: hasSessionToken || hasApiToken,
        hasToken: hasSessionToken || hasApiToken,
        status: hasSessionToken || hasApiToken ? 'connected' : 'disconnected',
        tokenSource: hasApiToken ? 'api_tokens' : hasSessionToken ? 'session' : 'none'
      });
    } catch (error) {
      console.error("HubSpot status check error:", error);
      res.status(500).json({ message: "Failed to check HubSpot status" });
    }
  });

  // Session management
  app.put("/api/session/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const updates = req.body;
      const session = await storage.updateSession(userId, updates);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Session update error:", error);
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  app.get("/api/session/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const session = await storage.getSession(userId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Session fetch error:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  // Player tiers
  app.get("/api/player-tiers", async (req, res) => {
    try {
      const tiers = await storage.getAllPlayerTiers();
      res.json(tiers);
    } catch (error) {
      console.error("Player tiers fetch error:", error);
      res.status(500).json({ message: "Failed to fetch player tiers" });
    }
  });

  app.get("/api/player-tiers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid tier ID" });
      }
      
      const tier = await storage.getPlayerTier(id);
      
      if (!tier) {
        return res.status(404).json({ message: "Player tier not found" });
      }
      
      res.json(tier);
    } catch (error) {
      console.error("Player tier fetch error:", error);
      res.status(500).json({ message: "Failed to fetch player tier" });
    }
  });

  // HubSpot token validation (mock for now - in production this would validate with HubSpot API)
  app.post("/api/validate-hubspot-token", async (req, res) => {
    try {
      const { token } = req.body;
      
      // Mock validation - in production, validate with HubSpot API
      if (!token || token.length < 10) {
        return res.status(400).json({ 
          valid: false, 
          message: "Invalid token format" 
        });
      }
      
      res.json({ 
        valid: true, 
        message: "Token validated successfully" 
      });
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(500).json({ message: "Token validation failed" });
    }
  });

  // Simulation management
  app.post("/api/simulation/start", async (req, res) => {
    try {
      const { userId, settings } = req.body;
      
      // Get user and session data
      const user = await storage.getUser(userId);
      const session = await storage.getSession(userId);
      
      if (!user || !session) {
        return res.status(404).json({ message: "User or session not found" });
      }
      
      // Create simulation record in database
      const simulation = await storage.createSimulation({
        userId,
        name: `${settings.theme} - ${settings.industry} Simulation`,
        theme: settings.theme || session.selectedTheme || 'generic',
        industry: settings.industry || session.selectedIndustry || 'business',
        frequency: settings.timeSpan || '1d',
        config: settings,
        status: 'pending',
        startedAt: new Date(),
        creditsUsed: 0
      });
      
      // Update session with simulation config
      await storage.updateSession(userId, {
        simulationConfig: settings
      });
      
      // Prepare orchestrator config
      const orchestratorConfig = {
        simulation_id: simulation.id,
        theme: simulation.theme,
        industry: simulation.industry,
        duration_days: settings.duration_days || 7,
        record_distribution: settings.record_distribution || {
          contacts: 10,
          companies: 5,
          deals: 5,
          tickets: 3,
          notes: 7
        },
        user_tier: user.playerTier || 'New Player',
        credit_limit: user.creditLimit || 150
      };
      
      // Start the orchestrator
      const orchestratorResult = await orchestrator.createSimulation(orchestratorConfig);
      
      if (!orchestratorResult.success) {
        await storage.updateSimulation(simulation.id, { status: 'failed' });
        throw new Error('Failed to initialize orchestrator');
      }
      
      // Update simulation status to running
      await storage.updateSimulation(simulation.id, { status: 'running' });
      
      // Call webhook if configured
      if (settings.webhookUrl) {
        try {
          const webhookPayload = {
            simulation_id: simulation.id,
            theme: simulation.theme,
            industry: simulation.industry,
            duration_days: orchestratorConfig.duration_days,
            record_distribution: orchestratorConfig.record_distribution,
            user_tier: orchestratorConfig.user_tier,
            credit_limit: orchestratorConfig.credit_limit,
            timestamp: new Date().toISOString()
          };
          
          const webhookResponse = await fetch(settings.webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookPayload)
          });
          
          console.log('Webhook response:', webhookResponse.status);
        } catch (webhookError) {
          console.error('Webhook call failed:', webhookError);
          // Don't fail the simulation if webhook fails
        }
      }
      
      res.json({ 
        status: "started",
        message: "Simulation initialized successfully",
        simulationId: simulation.id,
        orchestratorStatus: orchestratorResult
      });
    } catch (error) {
      console.error("Simulation start error:", error);
      res.status(500).json({ message: "Failed to start simulation" });
    }
  });
  
  // Get simulation status
  app.get("/api/simulation/:simulationId/status", async (req, res) => {
    try {
      const simulationId = parseInt(req.params.simulationId);
      const simulation = await storage.getSimulationById(simulationId);
      
      if (!simulation) {
        return res.status(404).json({ message: "Simulation not found" });
      }
      
      const orchestratorStatus = await orchestrator.getSimulationStatus(simulationId);
      
      res.json({
        simulation,
        orchestratorStatus
      });
    } catch (error) {
      console.error("Get simulation status error:", error);
      res.status(500).json({ message: "Failed to get simulation status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
