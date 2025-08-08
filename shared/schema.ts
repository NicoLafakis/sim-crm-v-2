import { sql } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, varchar, boolean, json } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  playerTier: varchar('player_tier', { length: 50 }).default('New Player'),
  creditLimit: integer('credit_limit').default(150),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Sessions table for storing user session data
export const sessions = pgTable('sessions', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  hubspotToken: text('hubspot_token'),
  hubspotRefreshToken: text('hubspot_refresh_token'),
  selectedTheme: varchar('selected_theme', { length: 100 }),
  selectedIndustry: varchar('selected_industry', { length: 100 }),
  selectedFrequency: varchar('selected_frequency', { length: 50 }),
  simulationConfig: json('simulation_config'),
  isActive: boolean('is_active').default(true),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Simulations table for tracking simulation history
export const simulations = pgTable('simulations', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  theme: varchar('theme', { length: 100 }).notNull(),
  industry: varchar('industry', { length: 100 }).notNull(),
  frequency: varchar('frequency', { length: 50 }).notNull(),
  config: json('config').notNull(),
  status: varchar('status', { length: 50 }).default('pending'), // pending, running, completed, failed
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  results: json('results'),
  creditsUsed: integer('credits_used').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// API tokens table for storing external service tokens
export const apiTokens = pgTable('api_tokens', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  service: varchar('service', { length: 100 }).notNull(), // hubspot, salesforce, etc.
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenType: varchar('token_type', { length: 50 }).default('Bearer'),
  scope: text('scope'),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Player tiers lookup table
export const playerTiers = pgTable('player_tiers', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  creditLimit: integer('credit_limit').notNull(),
  features: json('features'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Scheduled jobs for simulation orchestration
export const scheduledJobs = pgTable('scheduled_jobs', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  simulationId: integer('simulation_id').notNull().references(() => simulations.id, { onDelete: 'cascade' }),
  jobType: varchar('job_type', { length: 50 }).notNull(), // 'generate_persona', 'create_contact', 'create_company', etc.
  payload: json('payload').notNull(),
  status: varchar('status', { length: 50 }).default('pending'), // 'pending', 'processing', 'completed', 'failed'
  scheduledFor: timestamp('scheduled_for').notNull(),
  processedAt: timestamp('processed_at'),
  error: text('error'),
  retryCount: integer('retry_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Cached personas for reuse across simulations
export const cachedPersonas = pgTable('cached_personas', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  theme: varchar('theme', { length: 100 }).notNull(),
  industry: varchar('industry', { length: 100 }).notNull(),
  personaType: varchar('persona_type', { length: 50 }).notNull(), // 'contact', 'company', 'deal', etc.
  personaData: json('persona_data').notNull(),
  usageCount: integer('usage_count').default(0),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// HubSpot records created by the system for association tracking
export const hubspotRecords = pgTable('hubspot_records', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  simulationId: integer('simulation_id').notNull().references(() => simulations.id, { onDelete: 'cascade' }),
  hubspotObjectId: varchar('hubspot_object_id', { length: 100 }).notNull(), // HubSpot's internal ID
  objectType: varchar('object_type', { length: 50 }).notNull(), // 'contact', 'company', 'deal', 'ticket', 'note'
  themeKey: varchar('theme_key', { length: 200 }), // Unique identifier for association (e.g., 'john_lennon_beatles')
  personaData: json('persona_data'), // The original persona data used to create this record
  hubspotData: json('hubspot_data'), // The full HubSpot response after creation
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// HubSpot associations between records
export const hubspotAssociations = pgTable('hubspot_associations', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  simulationId: integer('simulation_id').notNull().references(() => simulations.id, { onDelete: 'cascade' }),
  fromRecordId: integer('from_record_id').notNull().references(() => hubspotRecords.id, { onDelete: 'cascade' }),
  toRecordId: integer('to_record_id').notNull().references(() => hubspotRecords.id, { onDelete: 'cascade' }),
  associationType: varchar('association_type', { length: 100 }).notNull(), // e.g., 'contact_to_company', 'deal_to_contact'
  hubspotAssociationId: varchar('hubspot_association_id', { length: 100 }), // HubSpot's association ID
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  simulations: many(simulations),
  apiTokens: many(apiTokens),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const simulationsRelations = relations(simulations, ({ one, many }) => ({
  user: one(users, {
    fields: [simulations.userId],
    references: [users.id],
  }),
  scheduledJobs: many(scheduledJobs),
  hubspotRecords: many(hubspotRecords),
  hubspotAssociations: many(hubspotAssociations),
}));

export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  user: one(users, {
    fields: [apiTokens.userId],
    references: [users.id],
  }),
}));

export const scheduledJobsRelations = relations(scheduledJobs, ({ one }) => ({
  simulation: one(simulations, {
    fields: [scheduledJobs.simulationId],
    references: [simulations.id],
  }),
}));

export const hubspotRecordsRelations = relations(hubspotRecords, ({ one, many }) => ({
  simulation: one(simulations, {
    fields: [hubspotRecords.simulationId],
    references: [simulations.id],
  }),
  associationsFrom: many(hubspotAssociations, {
    relationName: 'fromRecord',
  }),
  associationsTo: many(hubspotAssociations, {
    relationName: 'toRecord',
  }),
}));

export const hubspotAssociationsRelations = relations(hubspotAssociations, ({ one }) => ({
  simulation: one(simulations, {
    fields: [hubspotAssociations.simulationId],
    references: [simulations.id],
  }),
  fromRecord: one(hubspotRecords, {
    fields: [hubspotAssociations.fromRecordId],
    references: [hubspotRecords.id],
    relationName: 'fromRecord',
  }),
  toRecord: one(hubspotRecords, {
    fields: [hubspotAssociations.toRecordId],
    references: [hubspotRecords.id],
    relationName: 'toRecord',
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;
export type Simulation = typeof simulations.$inferSelect;
export type InsertSimulation = typeof simulations.$inferInsert;
export type ApiToken = typeof apiTokens.$inferSelect;
export type InsertApiToken = typeof apiTokens.$inferInsert;
export type PlayerTier = typeof playerTiers.$inferSelect;
export type InsertPlayerTier = typeof playerTiers.$inferInsert;
export type ScheduledJob = typeof scheduledJobs.$inferSelect;
export type InsertScheduledJob = typeof scheduledJobs.$inferInsert;
export type CachedPersona = typeof cachedPersonas.$inferSelect;
export type InsertCachedPersona = typeof cachedPersonas.$inferInsert;
export type HubSpotRecord = typeof hubspotRecords.$inferSelect;
export type InsertHubSpotRecord = typeof hubspotRecords.$inferInsert;
export type HubSpotAssociation = typeof hubspotAssociations.$inferSelect;
export type InsertHubSpotAssociation = typeof hubspotAssociations.$inferInsert;

// Zod schemas with passcode validation
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
}).extend({
  password: z.string()
    .min(6, "Passcode must be at least 6 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/, 
           "Passcode must contain 1 capital letter, 1 lowercase letter, and 1 special character")
});
export type InsertUserType = z.infer<typeof insertUserSchema>;

export const insertSessionSchema = createInsertSchema(sessions).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertSessionType = z.infer<typeof insertSessionSchema>;

export const insertSimulationSchema = createInsertSchema(simulations).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertSimulationType = z.infer<typeof insertSimulationSchema>;

export const insertApiTokenSchema = createInsertSchema(apiTokens).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertApiTokenType = z.infer<typeof insertApiTokenSchema>;

export const insertPlayerTierSchema = createInsertSchema(playerTiers).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertPlayerTierType = z.infer<typeof insertPlayerTierSchema>;

export const insertScheduledJobSchema = createInsertSchema(scheduledJobs).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertScheduledJobType = z.infer<typeof insertScheduledJobSchema>;

export const insertCachedPersonaSchema = createInsertSchema(cachedPersonas).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertCachedPersonaType = z.infer<typeof insertCachedPersonaSchema>;

export const insertHubSpotRecordSchema = createInsertSchema(hubspotRecords).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertHubSpotRecordType = z.infer<typeof insertHubSpotRecordSchema>;

export const insertHubSpotAssociationSchema = createInsertSchema(hubspotAssociations).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertHubSpotAssociationType = z.infer<typeof insertHubSpotAssociationSchema>;
