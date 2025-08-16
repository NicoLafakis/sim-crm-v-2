import { sql } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, varchar, boolean, json, jsonb, serial, numeric, unique } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { relations } from 'drizzle-orm';

// Simulation config type
export interface SimulationConfig {
  record_distribution: {
    contacts: number;
    companies: number;
    deals: number;
    tickets: number;
    notes: number;
  };
  totalSets?: number;
  duration_days?: number;
  timeSpan?: string;
  theme?: string;
  industry?: string;
  demoDetailsSamples?: string[];
}

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
  config: json('config').$type<SimulationConfig>().notNull(),
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

// Jobs table for tracking simulation jobs
export const jobs = pgTable('jobs', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  simulationId: integer('simulation_id').notNull().references(() => simulations.id, { onDelete: 'cascade' }),
  outcome: varchar('outcome', { length: 50 }), // won/lost
  theme: varchar('theme', { length: 255 }),
  industry: varchar('industry', { length: 255 }),
  contactSeq: integer('contact_seq'),
  originalSource: text('original_source'),
  acceleratorDays: numeric('accelerator_days', { precision: 10, scale: 2 }),
  baseCycleDays: integer('base_cycle_days'),
  jobStartAt: timestamp('job_start_at'),
  createdAt: timestamp('created_at').defaultNow(),
  status: varchar('status', { length: 50 }).default('pending'), // pending/running/done
  metadata: json('metadata'),
  context: json('context').$type<Record<string, string>>() // Record ID resolution context
});

// Job steps table for tracking individual steps in simulation jobs
export const jobSteps = pgTable('job_steps', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  jobId: integer('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  stepIndex: integer('step_index'),
  templateDay: integer('template_day'),
  scaledDay: integer('scaled_day'),
  scheduledAt: timestamp('scheduled_at'),
  typeOfAction: varchar('type_of_action', { length: 255 }),
  recordType: varchar('record_type', { length: 255 }),
  recordIdTpl: text('record_id_tpl'),
  associationsTpl: json('associations_tpl'),
  originalSource: text('original_source'),
  actionTpl: json('action_tpl'),
  reasonTpl: text('reason_tpl'),
  status: varchar('status', { length: 50 }),
  result: json('result')
});

// HubSpot pipelines and stages cache tables
export const hubspotPipelines = pgTable('hubspot_pipelines', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  hubspotId: varchar('hubspot_id', { length: 255 }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  displayOrder: integer('display_order'),
  objectType: varchar('object_type', { length: 50 }).notNull(), // deals, tickets, etc.
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const hubspotStages = pgTable('hubspot_stages', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  pipelineId: integer('pipeline_id').notNull().references(() => hubspotPipelines.id, { onDelete: 'cascade' }),
  hubspotId: varchar('hubspot_id', { length: 255 }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  displayOrder: integer('display_order'),
  probability: numeric('probability', { precision: 5, scale: 2 }), // Win probability percentage
  isClosed: boolean('is_closed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// HubSpot owners cache table for email-to-ID resolution
export const hubspotOwners = pgTable('hubspot_owners', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  hubspotId: varchar('hubspot_id', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    userEmailUnique: unique().on(table.userId, table.email)
  };
});

// Note: Simulation execution tables removed (scheduledJobs, cachedPersonas, hubspotRecords, hubspotAssociations)
// Only configuration storage remains, plus new jobs/jobSteps tables for job tracking

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  simulations: many(simulations),
  apiTokens: many(apiTokens),
  hubspotPipelines: many(hubspotPipelines),
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
  jobs: many(jobs),
}));

export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  user: one(users, {
    fields: [apiTokens.userId],
    references: [users.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  simulation: one(simulations, {
    fields: [jobs.simulationId],
    references: [simulations.id],
  }),
  jobSteps: many(jobSteps),
}));

export const jobStepsRelations = relations(jobSteps, ({ one }) => ({
  job: one(jobs, {
    fields: [jobSteps.jobId],
    references: [jobs.id],
  }),
}));

export const hubspotPipelinesRelations = relations(hubspotPipelines, ({ one, many }) => ({
  user: one(users, {
    fields: [hubspotPipelines.userId],
    references: [users.id],
  }),
  stages: many(hubspotStages),
}));

export const hubspotStagesRelations = relations(hubspotStages, ({ one }) => ({
  pipeline: one(hubspotPipelines, {
    fields: [hubspotStages.pipelineId],
    references: [hubspotPipelines.id],
  }),
}));

export const hubspotOwnersRelations = relations(hubspotOwners, ({ one }) => ({
  user: one(users, {
    fields: [hubspotOwners.userId],
    references: [users.id],
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
export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;
export type JobStep = typeof jobSteps.$inferSelect;
export type InsertJobStep = typeof jobSteps.$inferInsert;
export type HubspotPipeline = typeof hubspotPipelines.$inferSelect;
export type InsertHubspotPipeline = typeof hubspotPipelines.$inferInsert;
export type HubspotStage = typeof hubspotStages.$inferSelect;
export type InsertHubspotStage = typeof hubspotStages.$inferInsert;
export type HubspotOwner = typeof hubspotOwners.$inferSelect;
export type InsertHubspotOwner = typeof hubspotOwners.$inferInsert;

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

export const insertJobSchema = createInsertSchema(jobs).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertJobType = z.infer<typeof insertJobSchema>;

export const insertJobStepSchema = createInsertSchema(jobSteps).omit({ 
  id: true 
});
export type InsertJobStepType = z.infer<typeof insertJobStepSchema>;

export const insertHubspotPipelineSchema = createInsertSchema(hubspotPipelines).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertHubspotPipelineType = z.infer<typeof insertHubspotPipelineSchema>;

export const insertHubspotStageSchema = createInsertSchema(hubspotStages).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertHubspotStageType = z.infer<typeof insertHubspotStageSchema>;

// Note: Execution-related schemas removed (ScheduledJob, CachedPersona, HubSpotRecord, HubSpotAssociation)
