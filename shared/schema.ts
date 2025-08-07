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

export const simulationsRelations = relations(simulations, ({ one }) => ({
  user: one(users, {
    fields: [simulations.userId],
    references: [users.id],
  }),
}));

export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  user: one(users, {
    fields: [apiTokens.userId],
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
