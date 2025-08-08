import { 
  User, 
  InsertUser, 
  Session, 
  InsertSession, 
  PlayerTier, 
  InsertPlayerTier,
  Simulation,
  InsertSimulation,
  ApiToken,
  InsertApiToken,
  ScheduledJob,
  InsertScheduledJob,
  CachedPersona,
  InsertCachedPersona,
  users,
  sessions,
  playerTiers,
  simulations,
  apiTokens,
  scheduledJobs,
  cachedPersonas
} from "../shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;
  
  // Session operations
  getSession(userId: number): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(userId: number, updates: Partial<InsertSession>): Promise<Session | undefined>;
  deleteSession(id: number): Promise<void>;
  
  // Simulation operations
  createSimulation(simulationData: InsertSimulation): Promise<Simulation>;
  getSimulationById(id: number): Promise<Simulation | undefined>;
  getSimulationsByUserId(userId: number): Promise<Simulation[]>;
  updateSimulation(id: number, simulationData: Partial<Simulation>): Promise<Simulation>;
  
  // API Token operations
  createApiToken(tokenData: InsertApiToken): Promise<ApiToken>;
  getApiTokenByService(userId: number, service: string): Promise<ApiToken | undefined>;
  updateApiToken(id: number, tokenData: Partial<ApiToken>): Promise<ApiToken>;
  
  // Player tier operations
  getPlayerTier(id: number): Promise<PlayerTier | undefined>;
  getPlayerTierByName(name: string): Promise<PlayerTier | undefined>;
  getAllPlayerTiers(): Promise<PlayerTier[]>;
  
  // Scheduled job operations
  createScheduledJob(jobData: InsertScheduledJob): Promise<ScheduledJob>;
  getScheduledJobsBySimulation(simulationId: number): Promise<ScheduledJob[]>;
  getPendingJobs(limit?: number): Promise<ScheduledJob[]>;
  updateScheduledJob(id: number, jobData: Partial<ScheduledJob>): Promise<ScheduledJob>;
  
  // Cached persona operations
  createCachedPersona(personaData: InsertCachedPersona): Promise<CachedPersona>;
  getCachedPersona(theme: string, industry: string, personaType: string): Promise<CachedPersona | undefined>;
  updateCachedPersonaUsage(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializePlayerTiers();
  }

  private async initializePlayerTiers() {
    try {
      const existingTiers = await db.select().from(playerTiers);
      
      if (existingTiers.length === 0) {
        const defaultTiers: InsertPlayerTier[] = [
          {
            name: "New Player",
            creditLimit: 150,
            features: ["basic_simulation", "hubspot_connection"],
            description: "Perfect for getting started with CRM simulations"
          },
          {
            name: "Level 1",
            creditLimit: 325,
            features: ["basic_simulation", "hubspot_connection", "custom_fields"],
            description: "Enhanced features for growing businesses"
          },
          {
            name: "Level 2",
            creditLimit: 500,
            features: ["basic_simulation", "hubspot_connection", "custom_fields", "advanced_distribution"],
            description: "Professional-grade simulation capabilities"
          },
          {
            name: "Level 3",
            creditLimit: 1000,
            features: ["basic_simulation", "hubspot_connection", "custom_fields", "advanced_distribution", "custom_objects"],
            description: "Enterprise-level features and support"
          },
          {
            name: "Level 4",
            creditLimit: -1, // Unlimited
            features: ["all_features", "priority_support", "custom_webhooks"],
            description: "Ultimate access with custom solutions"
          },
        ];

        await db.insert(playerTiers).values(defaultTiers);
      }
    } catch (error) {
      console.error("Error initializing player tiers:", error);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  // Session operations
  async getSession(userId: number): Promise<Session | undefined> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), eq(sessions.isActive, true)));
    return session;
  }

  async createSession(sessionData: InsertSession): Promise<Session> {
    const [session] = await db.insert(sessions).values(sessionData).returning();
    return session;
  }

  async updateSession(userId: number, updates: Partial<InsertSession>): Promise<Session | undefined> {
    const existingSession = await this.getSession(userId);
    if (!existingSession) return undefined;
    
    const [session] = await db
      .update(sessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sessions.id, existingSession.id))
      .returning();
    
    return session;
  }

  async deleteSession(id: number): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  // Simulation operations
  async createSimulation(simulationData: InsertSimulation): Promise<Simulation> {
    const [simulation] = await db.insert(simulations).values(simulationData).returning();
    return simulation;
  }

  async getSimulationById(id: number): Promise<Simulation | undefined> {
    const [simulation] = await db.select().from(simulations).where(eq(simulations.id, id));
    return simulation;
  }

  async getSimulationsByUserId(userId: number): Promise<Simulation[]> {
    return await db.select().from(simulations).where(eq(simulations.userId, userId));
  }

  async updateSimulation(id: number, simulationData: Partial<Simulation>): Promise<Simulation> {
    const [simulation] = await db
      .update(simulations)
      .set({ ...simulationData, updatedAt: new Date() })
      .where(eq(simulations.id, id))
      .returning();
    
    if (!simulation) {
      throw new Error("Simulation not found");
    }
    return simulation;
  }

  // API Token operations
  async createApiToken(tokenData: InsertApiToken): Promise<ApiToken> {
    const [token] = await db.insert(apiTokens).values(tokenData).returning();
    return token;
  }

  async getApiTokenByService(userId: number, service: string): Promise<ApiToken | undefined> {
    const [token] = await db
      .select()
      .from(apiTokens)
      .where(and(
        eq(apiTokens.userId, userId), 
        eq(apiTokens.service, service),
        eq(apiTokens.isActive, true)
      ));
    return token;
  }

  async updateApiToken(id: number, tokenData: Partial<ApiToken>): Promise<ApiToken> {
    const [token] = await db
      .update(apiTokens)
      .set({ ...tokenData, updatedAt: new Date() })
      .where(eq(apiTokens.id, id))
      .returning();
    
    if (!token) {
      throw new Error("API Token not found");
    }
    return token;
  }

  // Player tier operations
  async getPlayerTier(id: number): Promise<PlayerTier | undefined> {
    const [tier] = await db.select().from(playerTiers).where(eq(playerTiers.id, id));
    return tier;
  }

  async getPlayerTierByName(name: string): Promise<PlayerTier | undefined> {
    const [tier] = await db.select().from(playerTiers).where(eq(playerTiers.name, name));
    return tier;
  }

  async getAllPlayerTiers(): Promise<PlayerTier[]> {
    return await db.select().from(playerTiers);
  }

  // Scheduled job operations
  async createScheduledJob(jobData: InsertScheduledJob): Promise<ScheduledJob> {
    const [job] = await db.insert(scheduledJobs).values(jobData).returning();
    return job;
  }

  async getScheduledJobsBySimulation(simulationId: number): Promise<ScheduledJob[]> {
    return await db.select().from(scheduledJobs).where(eq(scheduledJobs.simulationId, simulationId));
  }

  async getPendingJobs(limit: number = 100): Promise<ScheduledJob[]> {
    return await db
      .select()
      .from(scheduledJobs)
      .where(and(
        eq(scheduledJobs.status, 'pending'),
        eq(scheduledJobs.scheduledFor, new Date())
      ))
      .limit(limit);
  }

  async updateScheduledJob(id: number, jobData: Partial<ScheduledJob>): Promise<ScheduledJob> {
    const [job] = await db
      .update(scheduledJobs)
      .set({ ...jobData, updatedAt: new Date() })
      .where(eq(scheduledJobs.id, id))
      .returning();
    
    if (!job) {
      throw new Error("Scheduled job not found");
    }
    return job;
  }

  // Cached persona operations
  async createCachedPersona(personaData: InsertCachedPersona): Promise<CachedPersona> {
    const [persona] = await db.insert(cachedPersonas).values(personaData).returning();
    return persona;
  }

  async getCachedPersona(theme: string, industry: string, personaType: string): Promise<CachedPersona | undefined> {
    const [persona] = await db
      .select()
      .from(cachedPersonas)
      .where(and(
        eq(cachedPersonas.theme, theme),
        eq(cachedPersonas.industry, industry),
        eq(cachedPersonas.personaType, personaType)
      ));
    return persona;
  }

  async updateCachedPersonaUsage(id: number): Promise<void> {
    await db
      .update(cachedPersonas)
      .set({ 
        usageCount: sql`${cachedPersonas.usageCount} + 1`,
        lastUsedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(cachedPersonas.id, id));
  }
}

export const storage = new DatabaseStorage();
