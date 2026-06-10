import { pgTable, text, serial, integer, date, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Document-style persistence for the Procore-style project management tools.
// Each row holds one entity collection (e.g. "submittals") as a JSONB array;
// the "meta" row holds id counters. See server/persistence.ts.
export const appState = pgTable("app_state", {
  key: text("key").primaryKey(),
  data: jsonb("data").notNull(),
  updated_at: timestamp("updated_at").defaultNow(),
});


// Location schema
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const insertLocationSchema = createInsertSchema(locations).pick({
  name: true,
});

export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;

// Contractor schema
export const contractors = pgTable("contractors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const insertContractorSchema = createInsertSchema(contractors).pick({
  name: true,
});

export type InsertContractor = z.infer<typeof insertContractorSchema>;
export type Contractor = typeof contractors.$inferSelect;

// Activities schema
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location_id: integer("location_id").notNull(),
  contractor_id: integer("contractor_id").notNull(),
  start_date: date("start_date").notNull(),
  end_date: date("end_date").notNull(),
  duration: integer("duration").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  name: true,
  location_id: true,
  contractor_id: true,
  start_date: true,
  end_date: true,
  duration: true,
});

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

// Holiday schema
export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: date("date").notNull(),
  is_default: integer("is_default").notNull().default(0),
});

export const insertHolidaySchema = createInsertSchema(holidays).pick({
  name: true,
  date: true,
  is_default: true,
});

export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type Holiday = typeof holidays.$inferSelect;

// Project Settings schema
export const projectSettings = pgTable("project_settings", {
  id: serial("id").primaryKey(),
  first_day_of_week: text("first_day_of_week").default("sunday"),
  sunday_working: integer("sunday_working").default(0),
  monday_working: integer("monday_working").default(1),
  tuesday_working: integer("tuesday_working").default(1),
  wednesday_working: integer("wednesday_working").default(1),
  thursday_working: integer("thursday_working").default(1),
  friday_working: integer("friday_working").default(1),
  saturday_working: integer("saturday_working").default(0),
});

export const insertProjectSettingsSchema = createInsertSchema(projectSettings);

export type InsertProjectSettings = z.infer<typeof insertProjectSettingsSchema>;
export type ProjectSettings = typeof projectSettings.$inferSelect;
