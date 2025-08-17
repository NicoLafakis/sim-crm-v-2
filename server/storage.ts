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
  Job,
  InsertJob,
  JobStep,
  InsertJobStep,
  HubspotPipeline,
  InsertHubspotPipeline,
  HubspotStage,
  InsertHubspotStage,
  HubspotOwner,
  InsertHubspotOwner,
  users,
  sessions,
  playerTiers,
  simulations,
  apiTokens,
  jobs,
  jobSteps,
  hubspotPipelines,
  hubspotStages,
  hubspotOwners
} from "../shared/schema";
import { db } from "./db";
import { eq, and, sql, or, ne } from "drizzle-orm";

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
  
  // Additional user operations
  getUserById(id: number): Promise<User | undefined>;
  updateUserPassword(userId: number, newPassword: string): Promise<void>;
  
  // Additional simulation operations
  getSimulationsByUser(userId: number): Promise<Simulation[]>;
  deleteSimulation(simulationId: number): Promise<void>;
  
  // Additional token operations
  getUserTokens(userId: number): Promise<ApiToken[]>;
  createUserToken(tokenData: InsertApiToken): Promise<ApiToken>;
  deleteUserToken(tokenId: number): Promise<void>;

  // Job operations
  createJob(jobData: InsertJob): Promise<Job>;
  createJobSteps(jobStepsData: InsertJobStep[]): Promise<JobStep[]>;
  getDueJobSteps(scheduledAt: Date): Promise<JobStep[]>;
  updateJobStepStatus(stepId: number, status: string, result?: any): Promise<JobStep>;
  getJobById(jobId: number): Promise<Job | undefined>;
  
  // Job context operations for record ID resolution
  getJobContext(jobId: number): Promise<Record<string, string>>;
  updateJobContext(jobId: number, context: Record<string, string>): Promise<Job>;
  
  // Pipeline and stage operations
  cacheHubspotPipelines(userId: number, pipelines: InsertHubspotPipeline[]): Promise<HubspotPipeline[]>;
  cacheHubspotStages(stages: InsertHubspotStage[]): Promise<HubspotStage[]>;
  cacheHubspotOwners(owners: InsertHubspotOwner[]): Promise<void>;
  getHubspotPipelines(userId: number, objectType: string): Promise<HubspotPipeline[]>;
  getHubspotStages(pipelineId: number): Promise<HubspotStage[]>;
  getHubspotOwners(userId: number): Promise<HubspotOwner[]>;
  clearHubspotCache(userId: number): Promise<void>;
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
            features: ["basic_simulation"],
            description: "Perfect for getting started with CRM simulations"
          },
          {
            name: "Level 1",
            creditLimit: 325,
            features: ["basic_simulation", "custom_fields"],
            description: "Enhanced features for growing businesses"
          },
          {
            name: "Level 2",
            creditLimit: 500,
            features: ["basic_simulation", "custom_fields", "advanced_distribution"],
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

  // Note: Execution-related operations removed (ScheduledJob, CachedPersona, HubSpot operations)


  
  // Additional user operations
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async updateUserPassword(userId: number, newPassword: string): Promise<void> {
    await db.update(users).set({ password: newPassword }).where(eq(users.id, userId));
  }
  
  // Additional simulation operations
  async getSimulationsByUser(userId: number): Promise<Simulation[]> {
    const userSimulations = await db.select().from(simulations)
      .where(eq(simulations.userId, userId))
      .orderBy(simulations.startedAt);
    return userSimulations;
  }
  
  async deleteSimulation(simulationId: number): Promise<void> {
    await db.delete(simulations).where(eq(simulations.id, simulationId));
  }
  
  // Additional token operations
  async getUserTokens(userId: number): Promise<ApiToken[]> {
    const tokens = await db.select().from(apiTokens)
      .where(eq(apiTokens.userId, userId));
    return tokens.map(token => ({
      ...token,
      maskedToken: token.accessToken.substring(0, 8) + '...' + token.accessToken.slice(-4)
    }));
  }
  
  async createUserToken(tokenData: InsertApiToken): Promise<ApiToken> {
    const [token] = await db.insert(apiTokens).values(tokenData).returning();
    return token;
  }
  
  async deleteUserToken(tokenId: number): Promise<void> {
    await db.delete(apiTokens).where(eq(apiTokens.id, tokenId));
  }

  // Job operations
  async createJob(jobData: InsertJob): Promise<Job> {
    const [job] = await db.insert(jobs).values(jobData).returning();
    return job;
  }

  async createJobSteps(jobStepsData: InsertJobStep[]): Promise<JobStep[]> {
    const insertedSteps = await db.insert(jobSteps).values(jobStepsData).returning();
    return insertedSteps;
  }

  async getDueJobSteps(scheduledAt: Date): Promise<JobStep[]> {
    const dueSteps = await db.select({
      id: jobSteps.id,
      jobId: jobSteps.jobId,
      stepIndex: jobSteps.stepIndex,
      templateDay: jobSteps.templateDay,
      scaledDay: jobSteps.scaledDay,
      scheduledAt: jobSteps.scheduledAt,
      typeOfAction: jobSteps.typeOfAction,
      recordType: jobSteps.recordType,
      recordIdTpl: jobSteps.recordIdTpl,
      associationsTpl: jobSteps.associationsTpl,
      originalSource: jobSteps.originalSource,
      actionTpl: jobSteps.actionTpl,
      reasonTpl: jobSteps.reasonTpl,
      status: jobSteps.status,
      result: jobSteps.result
    })
    .from(jobSteps)
    .innerJoin(jobs, eq(jobSteps.jobId, jobs.id))
    .innerJoin(simulations, eq(jobs.simulationId, simulations.id))
    .where(and(
      eq(jobSteps.status, 'pending'),
      sql`${jobSteps.scheduledAt} <= ${scheduledAt}`,
      or(
        eq(simulations.status, 'running'),
        eq(simulations.status, 'processing')
      ),
      // Explicitly exclude stopped simulations to prevent race conditions
      ne(simulations.status, 'stopped')
    ))
    .orderBy(jobSteps.scheduledAt);
    return dueSteps;
  }

  async updateJobStepStatus(stepId: number, status: string, result?: any): Promise<JobStep> {
    const updateData: Partial<JobStep> = { status };
    if (result !== undefined) {
      updateData.result = result;
    }
    
    const [updatedStep] = await db.update(jobSteps)
      .set(updateData)
      .where(eq(jobSteps.id, stepId))
      .returning();
    return updatedStep;
  }

  async getJobById(jobId: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    return job;
  }

  async getJobContext(jobId: number): Promise<Record<string, string>> {
    const job = await this.getJobById(jobId);
    return job?.context as Record<string, string> || {};
  }

  async updateJobContext(jobId: number, context: Record<string, string>): Promise<Job> {
    const [result] = await db
      .update(jobs)
      .set({ context })
      .where(eq(jobs.id, jobId))
      .returning();
    return result;
  }

  // Pipeline and stage operations
  async cacheHubspotPipelines(userId: number, pipelines: InsertHubspotPipeline[]): Promise<HubspotPipeline[]> {
    // Clear existing pipelines for this user first
    await db.delete(hubspotPipelines).where(eq(hubspotPipelines.userId, userId));
    
    if (pipelines.length === 0) {
      return [];
    }
    
    const insertedPipelines = await db.insert(hubspotPipelines).values(pipelines).returning();
    return insertedPipelines;
  }

  async cacheHubspotStages(stages: InsertHubspotStage[]): Promise<HubspotStage[]> {
    if (stages.length === 0) {
      return [];
    }
    
    const insertedStages = await db.insert(hubspotStages).values(stages).returning();
    return insertedStages;
  }

  async getHubspotPipelines(userId: number, objectType: string): Promise<HubspotPipeline[]> {
    const pipelines = await db.select().from(hubspotPipelines)
      .where(and(
        eq(hubspotPipelines.userId, userId),
        eq(hubspotPipelines.objectType, objectType)
      ))
      .orderBy(hubspotPipelines.displayOrder);
    return pipelines;
  }

  async getHubspotStages(pipelineId: number): Promise<HubspotStage[]> {
    const stages = await db.select().from(hubspotStages)
      .where(eq(hubspotStages.pipelineId, pipelineId))
      .orderBy(hubspotStages.displayOrder);
    return stages;
  }

  async cacheHubspotOwners(owners: InsertHubspotOwner[]): Promise<void> {
    if (owners.length === 0) return;
    
    // Use upsert to handle email changes for existing owners
    for (const owner of owners) {
      await db.insert(hubspotOwners).values(owner).onConflictDoUpdate({
        target: [hubspotOwners.userId, hubspotOwners.email],
        set: {
          hubspotId: sql`excluded.hubspot_id`,
          firstName: sql`excluded.first_name`,
          lastName: sql`excluded.last_name`,
          isActive: sql`excluded.is_active`,
          updatedAt: sql`now()`,
        },
      });
    }
  }

  async getHubspotOwners(userId: number): Promise<HubspotOwner[]> {
    const owners = await db.select().from(hubspotOwners)
      .where(and(
        eq(hubspotOwners.userId, userId),
        eq(hubspotOwners.isActive, true)
      ))
      .orderBy(hubspotOwners.email);
    return owners;
  }

  async clearHubspotCache(userId: number): Promise<void> {
    await db.delete(hubspotPipelines).where(eq(hubspotPipelines.userId, userId));
    await db.delete(hubspotOwners).where(eq(hubspotOwners.userId, userId));
  }
}

export const storage = new DatabaseStorage();
