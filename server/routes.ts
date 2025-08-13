import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertSessionSchema } from "@shared/schema";
import { scheduleSimulationJob, validateDealStage } from "./orchestrator";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Determine outcome based on industry-specific win/loss rates
function determineOutcome(industry: string, requestedOutcome?: string): 'won' | 'lost' {
  // If outcome is explicitly requested, use it
  if (requestedOutcome === 'won' || requestedOutcome === 'lost') {
    return requestedOutcome;
  }
  
  // Apply industry-specific win/loss rates
  if (industry?.toLowerCase() === 'ecommerce') {
    // 75% win rate, 25% loss rate for E-commerce
    return Math.random() < 0.75 ? 'won' : 'lost';
  }
  
  // Default 50/50 for other industries
  return Math.random() < 0.5 ? 'won' : 'lost';
}

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

  // Simulation management with OpenAI processing
  app.post("/api/simulation/start", async (req, res) => {
    try {
      const { userId, settings } = req.body;
      
      // Get user and session data
      const user = await storage.getUser(userId);
      const session = await storage.getSession(userId);
      
      if (!user || !session) {
        return res.status(404).json({ message: "User or session not found" });
      }
      
      // Extract outcome and acceleratorDays from settings with industry-specific logic
      const industry = settings.industry || session.selectedIndustry || 'business';
      const requestedOutcome = settings.outcome; // May be undefined for random assignment
      const baseCycleDays = 30; // Base cycle is 30 days from CSV template
      const acceleratorDays = settings.acceleratorDays || baseCycleDays; // Default to base cycle
      
      // Create simulation record in database
      const simulation = await storage.createSimulation({
        userId,
        name: `${settings.theme} - ${settings.industry} Simulation`,
        theme: settings.theme || session.selectedTheme || 'generic',
        industry: settings.industry || session.selectedIndustry || 'business',
        frequency: settings.timeSpan || '1d',
        config: { ...settings, acceleratorDays },
        status: 'processing',
        startedAt: new Date(),
        creditsUsed: 0
      });
      
      // Update session with simulation config
      await storage.updateSession(userId, {
        simulationConfig: { ...settings, acceleratorDays }
      });
      
      console.log('Simulation started with orchestrator job scheduling:', {
        simulationId: simulation.id,
        theme: settings.theme,
        industry: settings.industry,
        acceleratorDays
      });
      
      try {
        // Determine final outcome using industry-specific rates
        const outcome = determineOutcome(industry, requestedOutcome);
        
        console.log(`Outcome determination: Industry=${industry}, Requested=${requestedOutcome}, Final=${outcome}`);
        
        // Schedule simulation job using the orchestrator
        const jobResult = await scheduleSimulationJob(simulation, outcome, acceleratorDays);
        
        // Call OpenAI with the simulation configuration for strategy generation
        const prompt = `Generate a comprehensive CRM simulation plan based on this configuration:

Theme: ${settings.theme}
Industry: ${settings.industry}
Outcome: ${outcome}
Duration: ${acceleratorDays} days (accelerated from ${baseCycleDays} day base cycle)
Record Distribution:
- Contacts: ${settings.record_distribution?.contacts || 'Medium'}
- Companies: ${settings.record_distribution?.companies || 'Medium'}  
- Deals: ${settings.record_distribution?.deals || 'Medium'}
- Tickets: ${settings.record_distribution?.tickets || 'Medium'}
- Notes: ${settings.record_distribution?.notes || 'Medium'}

Please provide a detailed simulation strategy with realistic business scenarios, persona profiles, and data generation recommendations in JSON format.`;

        let response;
        try {
          // Primary model: gpt-5-nano
          response = await openai.chat.completions.create({
            model: "gpt-5-nano",
            messages: [
              {
                role: "system",
                content: "You are a CRM simulation expert. Generate realistic business simulation strategies and data plans. Respond with valid JSON only."
              },
              {
                role: "user", 
                content: prompt
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 2000
          });
        } catch (primaryError) {
          console.log('Primary model gpt-5-nano failed, trying backup model gpt-4.1-nano:', primaryError);
          
          // Backup model: gpt-4.1-nano
          response = await openai.chat.completions.create({
            model: "gpt-4.1-nano",
            messages: [
              {
                role: "system",
                content: "You are a CRM simulation expert. Generate realistic business simulation strategies and data plans. Respond with valid JSON only."
              },
              {
                role: "user", 
                content: prompt
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 2000
          });
        }

        const aiResponse = JSON.parse(response.choices[0].message.content || '{}');
        
        // Update simulation with AI response and job info
        await storage.updateSimulation(simulation.id, {
          status: 'active',
          config: { ...settings, outcome, acceleratorDays, aiStrategy: aiResponse, jobId: jobResult.jobId }
        });

        console.log('Simulation job scheduled and AI strategy generated:', {
          simulationId: simulation.id,
          jobId: jobResult.jobId,
          stepsCount: jobResult.stepsCount,
          aiResponseLength: response.choices[0].message.content?.length || 0
        });

        res.json({ 
          status: "active",
          message: "Simulation started with job scheduling and AI strategy",
          simulationId: simulation.id,
          jobId: jobResult.jobId,
          stepsCount: jobResult.stepsCount,
          outcome,
          acceleratorDays,
          aiStrategy: aiResponse
        });

      } catch (error) {
        console.error('Simulation scheduling or AI processing failed:', error);
        
        // Update simulation status to failed
        await storage.updateSimulation(simulation.id, {
          status: 'failed'
        });
        
        res.status(500).json({ 
          message: "Simulation scheduling or AI processing failed",
          simulationId: simulation.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
    } catch (error) {
      console.error("Simulation start error:", error);
      res.status(500).json({ message: "Failed to start simulation" });
    }
  });
  
  // Get simulation status (no execution data)
  app.get("/api/simulation/:simulationId/status", async (req, res) => {
    try {
      const simulationId = parseInt(req.params.simulationId);
      const simulation = await storage.getSimulationById(simulationId);
      
      if (!simulation) {
        return res.status(404).json({ message: "Simulation not found" });
      }
      
      res.json({
        simulation
      });
    } catch (error) {
      console.error("Get simulation status error:", error);
      res.status(500).json({ message: "Failed to get simulation status" });
    }
  });

  // Get user's simulations
  app.get("/api/user/:userId/simulations", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const simulations = await storage.getSimulationsByUser(userId);
      res.json(simulations);
    } catch (error) {
      console.error("Get user simulations error:", error);
      res.status(500).json({ message: "Failed to get simulations" });
    }
  });

  // Simulation execution is now active through the orchestrator system

  app.delete("/api/simulation/:simulationId", async (req, res) => {
    try {
      const simulationId = parseInt(req.params.simulationId);
      await storage.deleteSimulation(simulationId);
      res.json({ message: "Simulation deleted" });
    } catch (error) {
      console.error("Delete simulation error:", error);
      res.status(500).json({ message: "Failed to delete simulation" });
    }
  });

  // User tokens endpoints
  app.get("/api/user/:userId/tokens", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const tokens = await storage.getUserTokens(userId);
      res.json(tokens);
    } catch (error) {
      console.error("Get user tokens error:", error);
      res.status(500).json({ message: "Failed to get tokens" });
    }
  });

  app.post("/api/user/:userId/tokens", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { service, tokenName, token } = req.body;
      const newToken = await storage.createUserToken({
        userId,
        service,
        accessToken: token
      });
      res.json(newToken);
    } catch (error) {
      console.error("Create token error:", error);
      res.status(500).json({ message: "Failed to create token" });
    }
  });

  app.delete("/api/user/:userId/tokens/:tokenId", async (req, res) => {
    try {
      const tokenId = parseInt(req.params.tokenId);
      await storage.deleteUserToken(tokenId);
      res.json({ message: "Token deleted" });
    } catch (error) {
      console.error("Delete token error:", error);
      res.status(500).json({ message: "Failed to delete token" });
    }
  });



  // Password change endpoint
  app.put("/api/user/:userId/password", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { currentPassword, newPassword } = req.body;
      
      const user = await storage.getUserById(userId);
      if (!user || user.password !== currentPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      await storage.updateUserPassword(userId, newPassword);
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Update password error:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Test route for pipeline validation
  app.post("/api/test/pipeline-validation", async (req, res) => {
    try {
      const { userId, dealData } = req.body;
      
      // Get user's HubSpot token
      const session = await storage.getSession(userId);
      if (!session?.hubspotToken) {
        return res.status(400).json({ message: "HubSpot token not found" });
      }
      
      // Use imported validation function
      const validation = await validateDealStage(userId, dealData, session.hubspotToken);
      
      res.json({
        validation,
        message: validation.isValid ? "Validation passed" : "Validation failed"
      });
    } catch (error) {
      console.error("Pipeline validation test error:", error);
      res.status(500).json({ 
        message: "Pipeline validation test failed", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Clear pipeline cache for testing
  app.post("/api/test/clear-pipeline-cache", async (req, res) => {
    try {
      const { userId } = req.body;
      await storage.clearHubspotCache(userId);
      res.json({ message: "Pipeline cache cleared successfully" });
    } catch (error) {
      console.error("Clear cache error:", error);
      res.status(500).json({ 
        message: "Failed to clear pipeline cache", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
