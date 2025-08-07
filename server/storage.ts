import { type User, type InsertUser, type Session, type InsertSession, type PlayerTier } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Session operations
  getSession(userId: string): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(userId: string, updates: Partial<InsertSession>): Promise<Session | undefined>;
  
  // Player tier operations
  getPlayerTier(id: string): Promise<PlayerTier | undefined>;
  getAllPlayerTiers(): Promise<PlayerTier[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sessions: Map<string, Session>;
  private playerTiers: Map<string, PlayerTier>;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.playerTiers = new Map();
    
    // Initialize player tiers
    this.initializePlayerTiers();
  }

  private initializePlayerTiers() {
    const tiers: PlayerTier[] = [
      {
        id: "new-player",
        name: "New Player",
        creditLimit: 150,
        features: JSON.stringify(["basic_simulation", "hubspot_connection"])
      },
      {
        id: "level-1",
        name: "Level 1",
        creditLimit: 325,
        features: JSON.stringify(["basic_simulation", "hubspot_connection", "custom_fields"])
      },
      {
        id: "level-2",
        name: "Level 2",
        creditLimit: 500,
        features: JSON.stringify(["basic_simulation", "hubspot_connection", "custom_fields", "advanced_distribution"])
      },
      {
        id: "level-3",
        name: "Level 3",
        creditLimit: 1000,
        features: JSON.stringify(["basic_simulation", "hubspot_connection", "custom_fields", "advanced_distribution", "custom_objects"])
      },
      {
        id: "level-4",
        name: "Level 4",
        creditLimit: -1, // Unlimited - Contact Us
        features: JSON.stringify(["all_features", "priority_support", "custom_webhooks"])
      }
    ];
    
    tiers.forEach(tier => this.playerTiers.set(tier.id, tier));
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async getSession(userId: string): Promise<Session | undefined> {
    return Array.from(this.sessions.values()).find(
      (session) => session.userId === userId,
    );
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = randomUUID();
    const session: Session = { 
      id,
      userId: insertSession.userId,
      hubspotToken: insertSession.hubspotToken ?? null,
      selectedTheme: insertSession.selectedTheme ?? null,
      selectedIndustry: insertSession.selectedIndustry ?? null,
      selectedFrequency: insertSession.selectedFrequency ?? null,
      playerTier: insertSession.playerTier ?? "new-player",
      creditLimit: insertSession.creditLimit ?? 150,
      simulationSettings: insertSession.simulationSettings ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.sessions.set(id, session);
    return session;
  }

  async updateSession(userId: string, updates: Partial<InsertSession>): Promise<Session | undefined> {
    const existingSession = await this.getSession(userId);
    if (!existingSession) return undefined;
    
    const updatedSession: Session = {
      ...existingSession,
      ...updates,
      updatedAt: new Date()
    };
    
    this.sessions.set(existingSession.id, updatedSession);
    return updatedSession;
  }

  async getPlayerTier(id: string): Promise<PlayerTier | undefined> {
    return this.playerTiers.get(id);
  }

  async getAllPlayerTiers(): Promise<PlayerTier[]> {
    return Array.from(this.playerTiers.values());
  }
}

export const storage = new MemStorage();
