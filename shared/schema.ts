import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  hubspotToken: text("hubspot_token"),
  selectedTheme: text("selected_theme"),
  selectedIndustry: text("selected_industry"),
  selectedFrequency: text("selected_frequency"),
  playerTier: text("player_tier").default("new-player"),
  creditLimit: integer("credit_limit").default(150),
  simulationSettings: text("simulation_settings"), // JSON string
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const playerTiers = pgTable("player_tiers", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  creditLimit: integer("credit_limit").notNull(),
  features: text("features"), // JSON string
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlayerTierSchema = createInsertSchema(playerTiers);

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type PlayerTier = typeof playerTiers.$inferSelect;
export type InsertPlayerTier = z.infer<typeof insertPlayerTierSchema>;
