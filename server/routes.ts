import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertSessionSchema } from "@shared/schema";
import { scheduleSimulationJob, validateDealStage } from "./orchestrator";
import { calculateSetOffset } from "./time-utils";
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

  // Test endpoint for staggered simulation scheduling
  app.post("/api/test/staggered-scheduling", async (req, res) => {
    try {
      const { setCount = 5, durationDays = 30 } = req.body;
      
      const { calculateSetOffset } = await import('./time-utils');
      
      const results = [];
      for (let contactSeq = 1; contactSeq <= setCount; contactSeq++) {
        const setStartOffset = calculateSetOffset(contactSeq, setCount, durationDays);
        const setStartAt = new Date(Date.now() + setStartOffset);
        const offsetHours = setStartOffset / (60 * 60 * 1000);
        
        results.push({
          contactSeq,
          setStartAt: setStartAt.toISOString(),
          offsetHours: Math.round(offsetHours * 100) / 100,
          offsetMs: setStartOffset
        });
      }
      
      res.json({
        setCount,
        durationDays,
        spacingHours: (durationDays * 24) / setCount,
        sets: results
      });
    } catch (error) {
      console.error("Staggered scheduling test error:", error);
      res.status(500).json({ message: "Test failed", error: error instanceof Error ? error.message : 'Unknown error' });
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
      const acceleratorDays = settings.duration_days || settings.acceleratorDays || baseCycleDays; // Use duration_days from frontend
      
      // Validate duration_days
      if (acceleratorDays <= 0) {
        return res.status(400).json({ message: "duration_days must be > 0" });
      }
      
      // Derive set count from contacts setting
      const setCount = Math.max(1, settings.record_distribution?.contacts ?? 1);
      
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
        
        // Schedule multiple simulation jobs (one per contact set)
        console.log(`Scheduling ${setCount} simulation sets with ${acceleratorDays} day duration`);
        
        const jobResults = [];
        for (let contactSeq = 1; contactSeq <= setCount; contactSeq++) {
          const setStartOffset = calculateSetOffset(contactSeq, setCount, acceleratorDays);
          const setStartAt = new Date(Date.now() + setStartOffset);
          
          console.log(`Scheduling set ${contactSeq}/${setCount} starting at ${setStartAt.toISOString()} (offset: ${Math.round(setStartOffset / 1000 / 60 / 60 * 100) / 100}h)`);
          
          const jobResult = await scheduleSimulationJob(
            simulation,
            outcome,
            acceleratorDays,
            contactSeq,
            setStartAt
          );
          
          jobResults.push(jobResult);
        }
        
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
          // Primary model: gpt-5-nano with rate limiting
          const { rateLimiter } = await import('./rate-limiter');
          response = await rateLimiter.executeWithRateLimit('openai', async () => {
            return await openai.chat.completions.create({
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
              max_completion_tokens: 2000
            });
          }, {
            onRetry: (attempt, error) => {
              console.log(`🔄 OpenAI API retry ${attempt + 1} for gpt-5-nano simulation: ${error.message}`);
            },
            onRateLimit: (delayMs) => {
              console.log(`🚦 OpenAI simulation rate limit triggered. Backing off for ${delayMs}ms`);
            }
          });
        } catch (primaryError) {
          console.log('Primary model gpt-5-nano failed, trying backup model gpt-4.1-nano:', primaryError);
          
          // Backup model: gpt-4.1-nano with rate limiting
          const { rateLimiter } = await import('./rate-limiter');
          response = await rateLimiter.executeWithRateLimit('openai', async () => {
            return await openai.chat.completions.create({
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
              max_completion_tokens: 2000
            });
          }, {
            onRetry: (attempt, error) => {
              console.log(`🔄 OpenAI API retry ${attempt + 1} for gpt-4.1-nano simulation: ${error.message}`);
            },
            onRateLimit: (delayMs) => {
              console.log(`🚦 OpenAI simulation fallback rate limit triggered. Backing off for ${delayMs}ms`);
            }
          });
        }

        const aiResponse = JSON.parse(response.choices[0].message.content || '{}');
        
        // Calculate total steps across all jobs
        const totalStepsCount = jobResults.reduce((sum, result) => sum + result.stepsCount, 0);
        const jobIds = jobResults.map(result => result.jobId);

        // Update simulation with AI response and job info
        await storage.updateSimulation(simulation.id, {
          status: 'processing',
          config: { ...settings, outcome, acceleratorDays, aiStrategy: aiResponse, jobIds, setCount }
        });

        console.log('Simulation jobs scheduled and AI strategy generated:', {
          simulationId: simulation.id,
          jobIds,
          setCount,
          totalStepsCount,
          aiResponseLength: response.choices[0].message.content?.length || 0
        });

        res.json({ 
          status: "active",
          message: "Simulation started with job scheduling and AI strategy",
          simulationId: simulation.id,
          jobIds,
          setCount,
          totalStepsCount,
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

  // Test endpoint for rate limiting and concurrency control
  app.get('/api/test/rate-limiting', async (req, res) => {
    try {
      const { rateLimitTester } = await import('./rate-limit-testing');
      const { rateLimiter } = await import('./rate-limiter');
      
      // Run comprehensive rate limit test
      const testResults = await rateLimitTester.runComprehensiveTest();
      
      res.json({
        message: 'Rate limiting test completed',
        ...testResults,
        rateLimiterConfig: rateLimiter.getConfig(),
        testStatus: rateLimitTester.getSimulationStatus()
      });
      
    } catch (error) {
      console.error("Rate limiting test error:", error);
      res.status(500).json({ 
        message: "Rate limiting test failed", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Test endpoint for simulating 429 responses on demand
  app.post('/api/test/simulate-rate-limits', async (req, res) => {
    try {
      const { rateLimitTester } = await import('./rate-limit-testing');
      const { 
        everyNthRequest = 3, 
        durationMs = 30000, 
        providers = ['hubspot', 'openai'],
        testRetryAfter = true 
      } = req.body;
      
      rateLimitTester.enableSimulation({
        simulateRateLimitEveryNth: everyNthRequest,
        simulateDuration: durationMs,
        providers,
        testRetryAfterHeader: testRetryAfter,
        concurrentRequests: 5
      });
      
      res.json({
        message: 'Rate limit simulation enabled',
        config: {
          everyNthRequest,
          durationMs,
          providers,
          testRetryAfter
        },
        status: rateLimitTester.getSimulationStatus()
      });
      
    } catch (error) {
      console.error("Rate limit simulation error:", error);
      res.status(500).json({ 
        message: "Failed to enable rate limit simulation", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Test endpoint for LLM guardrails and validation
  app.get('/api/test/llm-validation', async (req, res) => {
    try {
      const { LLMValidator, SeededGenerator, personaCache: guardrailsCache } = await import('./llm-guardrails');
      
      // Test valid LLM output
      const validData = {
        personas: [
          {
            firstName: "Luke",
            lastName: "Skywalker",
            email: "luke@rebellion.com", 
            company: "Rebel Alliance",
            jobTitle: "Jedi Knight",
            industry: "space_exploration",
            lifecycleStage: "customer",
            leadStatus: "connected"
          }
        ],
        companies: [
          {
            name: "Rebel Alliance",
            domain: "rebellion.com",
            industry: "space_exploration", 
            city: "Yavin Base",
            state: "Outer Rim",
            country: "Galaxy",
            lifecycleStage: "customer"
          }
        ]
      };
      
      // Test invalid LLM output (malformed data)
      const invalidData = {
        personas: [
          {
            firstName: "", // Invalid: empty required field
            lastName: "Vader", 
            email: "not-an-email", // Invalid: bad email format
            company: "Empire",
            jobTitle: "Sith Lord",
            industry: "dark_side",
            lifecycleStage: "invalid_stage" // Invalid: not in enum
          }
        ],
        companies: [
          {
            name: "", // Invalid: empty name
            domain: "empire.com",
            industry: "dark_side",
            city: "Death Star",
            lifecycleStage: "customer"
            // Missing required fields: state, country
          }
        ]
      };
      
      // Test corrupted JSON (completely malformed)
      const corruptedData = "{ invalid json structure }";
      
      // Run validation tests
      const validationResults = {
        validData: LLMValidator.validateGeneratedData(validData, "star_wars", "space_exploration"),
        invalidData: LLMValidator.validateGeneratedData(invalidData, "star_wars", "dark_side"),
        autoFixTest: LLMValidator.attemptAutoFix(invalidData)
      };
      
      // Test corrupted data handling
      let corruptedValidation;
      try {
        const parsedCorrupted = JSON.parse(corruptedData);
        corruptedValidation = LLMValidator.validateGeneratedData(parsedCorrupted, "test", "test");
      } catch (parseError) {
        corruptedValidation = {
          isValid: false,
          errors: [`JSON parse error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`],
          warnings: []
        };
      }
      
      // Test seeded generation
      const seed1 = SeededGenerator.generateSeed(1, "star_wars", "space_exploration", 0);
      const seed2 = SeededGenerator.generateSeed(1, "star_wars", "space_exploration", 0); // Same params
      const seed3 = SeededGenerator.generateSeed(2, "star_wars", "space_exploration", 0); // Different jobId
      
      // Test cache functionality
      guardrailsCache.set("star_wars", "space_exploration", validData, seed1, 30000); // 30 second TTL
      const cacheHit = guardrailsCache.get("star_wars", "space_exploration", seed1);
      const cacheMiss = guardrailsCache.get("marvel", "superhero");
      
      res.json({
        message: "LLM validation test completed",
        testResults: {
          validData: {
            input: "Valid Star Wars persona data",
            result: validationResults.validData,
            status: validationResults.validData.isValid ? "PASS" : "FAIL"
          },
          invalidData: {
            input: "Invalid persona data (empty fields, bad email, invalid enum)",
            result: validationResults.invalidData,
            status: validationResults.invalidData.isValid ? "FAIL" : "PASS" // Should fail validation
          },
          corruptedData: {
            input: "Malformed JSON structure",
            result: corruptedValidation,
            status: corruptedValidation.isValid ? "FAIL" : "PASS" // Should fail parsing
          },
          autoFixTest: {
            input: "Invalid data with auto-fix attempt",
            result: validationResults.autoFixTest,
            status: validationResults.autoFixTest.fixed ? "PASS" : "PARTIAL"
          }
        },
        seedingTests: {
          deterministicSeeds: {
            seed1,
            seed2,
            seed3,
            seed1EqualsSeed2: seed1 === seed2, // Should be true
            seed1EqualsSeed3: seed1 === seed3  // Should be false
          },
          seedValidation: {
            validSeed: SeededGenerator.isValidSeed(seed1),
            invalidSeed: SeededGenerator.isValidSeed("invalid123")
          }
        },
        cacheTests: {
          cacheSet: "star_wars + space_exploration cached with seed",
          cacheHit: cacheHit ? "SUCCESS" : "FAILED", 
          cacheMiss: cacheMiss ? "FAILED" : "SUCCESS",
          cacheStats: guardrailsCache.getStats()
        },
        summary: {
          validationPassed: validationResults.validData.isValid,
          invalidationWorked: !validationResults.invalidData.isValid,
          corruptedHandled: !corruptedValidation.isValid,
          autoFixWorked: validationResults.autoFixTest.fixed,
          seedingDeterministic: seed1 === seed2 && seed1 !== seed3,
          cacheFunctional: !!cacheHit && !cacheMiss
        }
      });
      
    } catch (error) {
      console.error("LLM validation test error:", error);
      res.status(500).json({ 
        message: "LLM validation test failed", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Test endpoint for forcing malformed LLM output
  app.post('/api/test/force-malformed-llm', async (req, res) => {
    try {
      const { theme = "star_wars", industry = "space_exploration", forceType = "invalid_json" } = req.body;
      
      // Simulate different types of malformed LLM outputs
      let malformedData;
      switch (forceType) {
        case 'invalid_json':
          malformedData = "{ personas: [{ firstName: 'Luke', invalid syntax }";
          break;
        case 'missing_required_fields':
          malformedData = {
            personas: [{ firstName: "Luke" }], // Missing required fields
            companies: [{ name: "Rebellion" }] // Missing required fields
          };
          break;
        case 'invalid_enums':
          malformedData = {
            personas: [{
              firstName: "Luke",
              lastName: "Skywalker", 
              email: "luke@rebellion.com",
              company: "Rebel Alliance",
              jobTitle: "Jedi",
              industry: "space",
              lifecycleStage: "invalid_stage" // Invalid enum
            }]
          };
          break;
        case 'type_mismatch':
          malformedData = {
            personas: [{
              firstName: 123, // Should be string
              lastName: "Skywalker",
              email: "luke@rebellion.com",
              company: "Rebel Alliance", 
              jobTitle: "Jedi",
              industry: "space",
              lifecycleStage: "customer"
            }]
          };
          break;
        default:
          malformedData = null;
      }
      
      // Test validation failure path
      const { LLMValidator } = await import('./llm-guardrails');
      
      let validationResult;
      if (forceType === 'invalid_json') {
        try {
          JSON.parse(malformedData as string);
          validationResult = { isValid: false, errors: ['Should have failed JSON parsing'], warnings: [] };
        } catch (parseError) {
          validationResult = {
            isValid: false,
            errors: [`JSON parse error: ${parseError instanceof Error ? parseError.message : 'Parse failed'}`],
            warnings: [],
            parseErrorHandled: true
          };
        }
      } else {
        validationResult = LLMValidator.validateGeneratedData(malformedData, theme, industry);
      }
      
      // Test auto-fix attempt
      const autoFixResult = malformedData && typeof malformedData === 'object' 
        ? LLMValidator.attemptAutoFix(malformedData)
        : { fixed: false, data: malformedData, changes: ['Cannot auto-fix malformed JSON'] };
      
      res.json({
        message: `Malformed LLM output test: ${forceType}`,
        testType: forceType,
        malformedData,
        validationResult,
        autoFixResult,
        stepStatus: validationResult.isValid ? "should_retry" : "failed_non_retryable",
        acceptanceCriteria: {
          invalidOutputRejected: !validationResult.isValid,
          clearErrorMessage: validationResult.errors?.length > 0,
          stepMarkedFailed: !validationResult.isValid
        }
      });
      
    } catch (error) {
      console.error("Malformed LLM test error:", error);
      res.status(500).json({ 
        message: "Failed to test malformed LLM output", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Test endpoint for comprehensive association validation and mapping
  app.get('/api/test/association-validation', async (req, res) => {
    try {
      // Import association functions from orchestrator
      const { validateAssociation, getSupportedAssociations } = await import("./orchestrator");
      
      // Test scenarios for association validation
      const testResults: any = {
        supportedAssociations: getSupportedAssociations(),
        validationTests: {
          // Valid associations
          validAssociations: [
            { from: 'contacts', to: 'companies', expected: 'valid' },
            { from: 'deals', to: 'contacts', expected: 'valid' },
            { from: 'tickets', to: 'deals', expected: 'valid' },
            { from: 'notes', to: 'contacts', expected: 'valid' },
            { from: 'calls', to: 'companies', expected: 'valid' },
            { from: 'emails', to: 'deals', expected: 'valid' },
            { from: 'meetings', to: 'tickets', expected: 'valid' },
            { from: 'tasks', to: 'contacts', expected: 'valid' },
          ],
          // Invalid associations
          invalidAssociations: [
            { from: 'notes', to: 'tickets', expected: 'invalid' }, // Test case: Note ↔ Ticket
            { from: 'unsupported_type', to: 'contacts', expected: 'invalid' },
            { from: 'contacts', to: 'nonexistent', expected: 'invalid' },
            { from: 'products', to: 'contacts', expected: 'invalid' }, // Products can't associate with contacts
          ]
        },
        detailedValidations: {} as any,
        userRequestedTest: {} as any
      };
      
      // Test valid associations
      for (const test of testResults.validationTests.validAssociations) {
        const validation = validateAssociation(test.from, test.to);
        testResults.detailedValidations[`${test.from}_to_${test.to}`] = {
          input: test,
          result: validation,
          status: validation.isValid ? 'PASS' : 'FAIL',
          associationTypeId: validation.associationTypeId
        };
      }
      
      // Test invalid associations  
      for (const test of testResults.validationTests.invalidAssociations) {
        const validation = validateAssociation(test.from, test.to);
        testResults.detailedValidations[`${test.from}_to_${test.to}`] = {
          input: test,
          result: validation,
          status: !validation.isValid ? 'PASS' : 'FAIL', // Should fail for invalid
          error: validation.error,
          supportedAssociations: validation.supportedAssociations
        };
      }
      
      // Test specific user request: Note ↔ Ticket
      const noteToTicketValidation = validateAssociation('notes', 'tickets');
      const ticketToNoteValidation = validateAssociation('tickets', 'notes');
      
      testResults.userRequestedTest = {
        noteToTicket: {
          validation: noteToTicketValidation,
          status: noteToTicketValidation.isValid ? 'SUPPORTED' : 'UNSUPPORTED',
          message: noteToTicketValidation.isValid ? 
            `Association supported with type ID: ${noteToTicketValidation.associationTypeId}` :
            `Association not supported: ${noteToTicketValidation.error}`
        },
        ticketToNote: {
          validation: ticketToNoteValidation, 
          status: ticketToNoteValidation.isValid ? 'SUPPORTED' : 'UNSUPPORTED',
          message: ticketToNoteValidation.isValid ?
            `Association supported with type ID: ${ticketToNoteValidation.associationTypeId}` :
            `Association not supported: ${ticketToNoteValidation.error}`
        }
      };
      
      // Summary statistics
      const totalTests = Object.keys(testResults.detailedValidations).length;
      const passedTests = Object.values(testResults.detailedValidations).filter((test: any) => test.status === 'PASS').length;
      
      res.json({
        message: 'Association validation test completed',
        summary: {
          totalTests,
          passed: passedTests,
          failed: totalTests - passedTests,
          successRate: `${Math.round((passedTests / totalTests) * 100)}%`
        },
        results: testResults
      });
      
    } catch (error) {
      console.error("Association validation test error:", error);
      res.status(500).json({ 
        message: "Association validation test failed", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Test endpoint for comprehensive property creation and option management
  app.get('/api/test/property-creation', async (req, res) => {
    try {
      const userId = 1; // Test user
      
      // Import functions from orchestrator
      const { determinePropertyType, determineFieldType, validateAndCoerceRecordData } = await import("./orchestrator");
      
      // Mock test data with various property types and missing options
      const testRecords = [
        {
          objectType: 'contacts',
          data: {
            firstname: 'John',
            lastname: 'Doe',
            email: 'john.doe@example.com',
            // Custom properties to be created
            industry_segment: 'Esports',  // Single-select with missing option
            lead_score: 85,               // Number
            is_qualified: true,           // Boolean
            last_activity_date: '2024-08-13T10:00:00Z', // DateTime
            tags: ['VIP', 'Gaming', 'Tech Enthusiast'],  // Multi-select
            company_size: 'Enterprise',   // Single-select
            owner_email: 'sales@company.com' // Owner assignment
          }
        },
        {
          objectType: 'companies',
          data: {
            name: 'Gaming Corp',
            domain: 'gaming-corp.com',
            // Custom properties to be created
            company_tier: 'Premium',      // Single-select with missing option
            annual_revenue: 5000000,      // Number (currency)
            is_active: true,              // Boolean
            founded_date: '2020-01-15',   // Date
            services: ['Development', 'Publishing', 'Marketing'], // Multi-select
            industry_vertical: 'Gaming'   // Single-select
          }
        },
        {
          objectType: 'deals',
          data: {
            dealname: 'Gaming Partnership Deal',
            amount: 250000,
            // Custom properties to be created
            deal_priority: 'High',        // Single-select with missing option
            probability_score: 75,        // Number (percentage)
            is_hot_deal: true,            // Boolean
            expected_close_date: '2024-12-31', // Date
            deal_sources: ['Referral', 'Inbound'], // Multi-select
            contract_type: 'Annual'       // Single-select
          }
        }
      ];
      
      const results = [];
      
      for (const testRecord of testRecords) {
        try {
          console.log(`🧪 Testing property creation for ${testRecord.objectType} with data:`, testRecord.data);
          
          // Test the comprehensive property system
          const { validData, errors } = validateAndCoerceRecordData(testRecord.data, testRecord.objectType);
          
          console.log(`✅ Data validation completed. Valid properties: ${Object.keys(validData).length}, Errors: ${errors.length}`);
          
          // Note: In a real scenario, this would create properties in HubSpot
          // For testing purposes, we're demonstrating the system logic
          results.push({
            objectType: testRecord.objectType,
            originalData: testRecord.data,
            validatedData: validData,
            validationErrors: errors,
            propertiesAnalyzed: Object.keys(testRecord.data).map(key => {
              const propertyType = determinePropertyType(key, testRecord.data);
              return {
                name: key,
                type: propertyType.type,
                description: propertyType.description,
                fieldType: determineFieldType(key, propertyType),
                hasOptions: propertyType.options?.length > 0,
                options: propertyType.options || []
              };
            })
          });
          
        } catch (error: any) {
          results.push({
            objectType: testRecord.objectType,
            error: error.message
          });
        }
      }
      
      res.json({
        success: true,
        message: 'Property creation and option management test completed',
        results: results,
        summary: {
          totalRecordsTested: testRecords.length,
          successfulAnalyses: results.filter(r => !r.error).length,
          propertyTypesDetected: [
            'string (text/email/textarea)',
            'number (currency/unformatted)', 
            'bool (checkbox)',
            'datetime (date)',
            'enumeration (select/multi-select)'
          ]
        }
      });
      
    } catch (error: any) {
      console.error('Property creation test error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Property creation test failed'
      });
    }
  });

  // Test route for owner assignment
  app.post("/api/test/owner-assignment", async (req, res) => {
    try {
      const { userId, recordData, objectType = "contact" } = req.body;
      
      // Get user's HubSpot token
      const session = await storage.getSession(userId);
      if (!session?.hubspotToken) {
        return res.status(400).json({ message: "HubSpot token not found" });
      }
      
      // Import functions from orchestrator
      const { resolveOwnerEmail } = await import("./orchestrator");
      
      // Test owner resolution
      const resolvedData = await resolveOwnerEmail(userId, recordData, session.hubspotToken);
      
      res.json({
        originalData: recordData,
        resolvedData,
        hasOwnerAssignment: !!resolvedData.hubspot_owner_id,
        message: resolvedData.hubspot_owner_id ? "Owner resolved successfully" : "No owner assignment needed"
      });
    } catch (error) {
      console.error("Owner assignment test error:", error);
      res.status(500).json({ 
        message: "Owner assignment test failed", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Test route for viewing cached owners
  app.get("/api/test/owners/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const owners = await storage.getHubspotOwners(userId);
      
      res.json({
        owners: owners.map(owner => ({
          id: owner.hubspotId,
          email: owner.email,
          name: `${owner.firstName || ''} ${owner.lastName || ''}`.trim(),
          isActive: owner.isActive
        })),
        count: owners.length,
        message: `Found ${owners.length} cached owners`
      });
    } catch (error) {
      console.error("Get owners error:", error);
      res.status(500).json({ 
        message: "Failed to get owners", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
