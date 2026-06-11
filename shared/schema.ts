import {
  pgTable, text, serial, integer, real, boolean, date, timestamp, jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// =============================================================================
// Schedule (pre-existing tables — left untouched)
// =============================================================================

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});
export const insertLocationSchema = createInsertSchema(locations).pick({ name: true });
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;

export const contractors = pgTable("contractors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});
export const insertContractorSchema = createInsertSchema(contractors).pick({ name: true });
export type InsertContractor = z.infer<typeof insertContractorSchema>;
export type Contractor = typeof contractors.$inferSelect;

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
  name: true, location_id: true, contractor_id: true,
  start_date: true, end_date: true, duration: true,
});
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: date("date").notNull(),
  is_default: integer("is_default").notNull().default(0),
});
export const insertHolidaySchema = createInsertSchema(holidays).pick({
  name: true, date: true, is_default: true,
});
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type Holiday = typeof holidays.$inferSelect;

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

// =============================================================================
// Procore-style project management tools
//
// Naming convention: snake_case columns in the database, camelCase aliases on
// the TS types. Common fields:
//   id          – serial primary key
//   created_at  – timestamp with default NOW()
//   *_id        – foreign key references (no cascade configured at the DB
//                 level; storage handles cleanup explicitly so child-row
//                 removals can fan out to disk-backed attachments too)
// =============================================================================

export const users_t = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("Subcontractor"),
  company: text("company").notNull().default(""),
  title: text("title").notNull().default(""),
  phone: text("phone").notNull().default(""),
  password_hash: text("password_hash").notNull().default(""),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const primeContracts_t = pgTable("prime_contracts", {
  id: serial("id").primaryKey(),
  number: text("number").notNull().default(""),
  title: text("title").notNull(),
  owner: text("owner").notNull().default(""),
  contractor: text("contractor").notNull().default(""),
  architect: text("architect").notNull().default(""),
  status: text("status").notNull().default("Draft"),
  executed: boolean("executed").notNull().default(false),
  contract_date: date("contract_date"),
  start_date: date("start_date"),
  substantial_completion_date: date("substantial_completion_date"),
  actual_completion_date: date("actual_completion_date"),
  signed_contract_received_date: date("signed_contract_received_date"),
  retainage_percent: real("retainage_percent").notNull().default(10),
  description: text("description").notNull().default(""),
  inclusions: text("inclusions").notNull().default(""),
  exclusions: text("exclusions").notNull().default(""),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const sovLineItems_t = pgTable("sov_line_items", {
  id: serial("id").primaryKey(),
  prime_contract_id: integer("prime_contract_id").notNull(),
  item_number: text("item_number").notNull().default(""),
  cost_code: text("cost_code").notNull().default(""),
  description: text("description").notNull(),
  scheduled_value: real("scheduled_value").notNull().default(0),
});

export const submittals_t = pgTable("submittals", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  revision: integer("revision").notNull().default(0),
  title: text("title").notNull(),
  spec_section: text("spec_section").notNull().default(""),
  submittal_type: text("submittal_type").notNull().default("Product Data"),
  status: text("status").notNull().default("Draft"),
  responsible_contractor: text("responsible_contractor").notNull().default(""),
  received_from: text("received_from").notNull().default(""),
  submit_by: text("submit_by").notNull().default(""),
  ball_in_court: text("ball_in_court").notNull().default(""),
  date_submitted: date("date_submitted"),
  date_returned: date("date_returned"),
  due_date: date("due_date"),
  lead_time_days: integer("lead_time_days").notNull().default(0),
  required_on_site_date: date("required_on_site_date"),
  description: text("description").notNull().default(""),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const submittalSteps_t = pgTable("submittal_steps", {
  id: serial("id").primaryKey(),
  submittal_id: integer("submittal_id").notNull(),
  step_number: integer("step_number").notNull(),
  approver_name: text("approver_name").notNull(),
  approver_user_id: integer("approver_user_id"),
  due_date: date("due_date"),
  status: text("status").notNull().default("Pending"),
  comments: text("comments").notNull().default(""),
  responded_at: timestamp("responded_at"),
});

export const rfis_t = pgTable("rfis", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  subject: text("subject").notNull(),
  question: text("question").notNull().default(""),
  answer: text("answer").notNull().default(""),
  status: text("status").notNull().default("Draft"),
  priority: text("priority").notNull().default("Medium"),
  assigned_to: text("assigned_to").notNull().default(""),
  rfi_manager: text("rfi_manager").notNull().default(""),
  received_from: text("received_from").notNull().default(""),
  responsible_contractor: text("responsible_contractor").notNull().default(""),
  spec_section: text("spec_section").notNull().default(""),
  drawing_number: text("drawing_number").notNull().default(""),
  location: text("location").notNull().default(""),
  cost_impact: text("cost_impact").notNull().default("TBD"),
  cost_impact_amount: real("cost_impact_amount").notNull().default(0),
  schedule_impact: text("schedule_impact").notNull().default("TBD"),
  schedule_impact_days: integer("schedule_impact_days").notNull().default(0),
  ball_in_court: text("ball_in_court").notNull().default(""),
  date_initiated: date("date_initiated"),
  due_date: date("due_date"),
  date_closed: date("date_closed"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const drawings_t = pgTable("drawings", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  title: text("title").notNull(),
  discipline: text("discipline").notNull().default("Architectural"),
  revision: text("revision").notNull().default("0"),
  drawing_date: date("drawing_date"),
  received_date: date("received_date"),
  drawing_set: text("drawing_set").notNull().default(""),
  status: text("status").notNull().default("Current"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const drawingPins_t = pgTable("drawing_pins", {
  id: serial("id").primaryKey(),
  drawing_id: integer("drawing_id").notNull(),
  x: real("x").notNull(),
  y: real("y").notNull(),
  link_type: text("link_type").notNull().default("note"),
  linked_id: integer("linked_id"),
  note: text("note").notNull().default(""),
  created_by: text("created_by").notNull().default(""),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const specSections_t = pgTable("spec_sections", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  title: text("title").notNull(),
  division: text("division").notNull(),
  revision: text("revision").notNull().default("0"),
  spec_set: text("spec_set").notNull().default(""),
  issued_date: date("issued_date"),
  received_date: date("received_date"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const dailyLogs_t = pgTable("daily_logs", {
  id: serial("id").primaryKey(),
  log_date: date("log_date").notNull().unique(),
  weather_conditions: text("weather_conditions").notNull().default("Clear"),
  temp_high: real("temp_high"),
  temp_low: real("temp_low"),
  precipitation: text("precipitation").notNull().default(""),
  wind_speed: text("wind_speed").notNull().default(""),
  weather_delay: boolean("weather_delay").notNull().default(false),
  notes: text("notes").notNull().default(""),
  delays: text("delays").notNull().default(""),
  safety_notes: text("safety_notes").notNull().default(""),
  visitors: text("visitors").notNull().default(""),
  equipment_on_site: text("equipment_on_site").notNull().default(""),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const manpowerEntries_t = pgTable("manpower_entries", {
  id: serial("id").primaryKey(),
  daily_log_id: integer("daily_log_id").notNull(),
  contractor: text("contractor").notNull(),
  workers: integer("workers").notNull().default(0),
  hours: real("hours").notNull().default(0),
  location: text("location").notNull().default(""),
  comments: text("comments").notNull().default(""),
});

export const punchItems_t = pgTable("punch_items", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("Open"),
  priority: text("priority").notNull().default("Medium"),
  location: text("location").notNull().default(""),
  trade: text("trade").notNull().default(""),
  assignee: text("assignee").notNull().default(""),
  ball_in_court: text("ball_in_court").notNull().default(""),
  due_date: date("due_date"),
  date_closed: date("date_closed"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const changeEvents_t = pgTable("change_events", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("Open"),
  scope: text("scope").notNull().default("TBD"),
  event_type: text("event_type").notNull().default("Owner Change"),
  origin: text("origin").notNull().default(""),
  description: text("description").notNull().default(""),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const changeEventLineItems_t = pgTable("change_event_line_items", {
  id: serial("id").primaryKey(),
  change_event_id: integer("change_event_id").notNull(),
  cost_code: text("cost_code").notNull().default(""),
  description: text("description").notNull(),
  vendor: text("vendor").notNull().default(""),
  rom_amount: real("rom_amount").notNull().default(0),
});

export const changeOrders_t = pgTable("change_orders", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("Draft"),
  change_event_id: integer("change_event_id"),
  description: text("description").notNull().default(""),
  schedule_impact_days: integer("schedule_impact_days").notNull().default(0),
  executed: boolean("executed").notNull().default(false),
  signed_date: date("signed_date"),
  date_created: date("date_created"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const changeOrderLineItems_t = pgTable("change_order_line_items", {
  id: serial("id").primaryKey(),
  change_order_id: integer("change_order_id").notNull(),
  cost_code: text("cost_code").notNull().default(""),
  description: text("description").notNull(),
  amount: real("amount").notNull().default(0),
});

export const budgetLineItems_t = pgTable("budget_line_items", {
  id: serial("id").primaryKey(),
  cost_code: text("cost_code").notNull(),
  description: text("description").notNull(),
  original_budget: real("original_budget").notNull().default(0),
  budget_modifications: real("budget_modifications").notNull().default(0),
  committed_costs: real("committed_costs").notNull().default(0),
  direct_costs: real("direct_costs").notNull().default(0),
  pending_budget_changes: real("pending_budget_changes").notNull().default(0),
});

export const commitments_t = pgTable("commitments", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  title: text("title").notNull(),
  commitment_type: text("commitment_type").notNull().default("Subcontract"),
  status: text("status").notNull().default("Draft"),
  vendor: text("vendor").notNull().default(""),
  executed_date: date("executed_date"),
  retainage_percent: real("retainage_percent").notNull().default(10),
  description: text("description").notNull().default(""),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const commitmentLineItems_t = pgTable("commitment_line_items", {
  id: serial("id").primaryKey(),
  commitment_id: integer("commitment_id").notNull(),
  cost_code: text("cost_code").notNull().default(""),
  description: text("description").notNull(),
  amount: real("amount").notNull().default(0),
});

export const ownerInvoices_t = pgTable("owner_invoices", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  period_start: date("period_start"),
  period_end: date("period_end").notNull(),
  billing_date: date("billing_date").notNull(),
  status: text("status").notNull().default("Draft"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const invoiceLineItems_t = pgTable("invoice_line_items", {
  id: serial("id").primaryKey(),
  invoice_id: integer("invoice_id").notNull(),
  sov_line_item_id: integer("sov_line_item_id").notNull(),
  work_this_period: real("work_this_period").notNull().default(0),
  stored_materials: real("stored_materials").notNull().default(0),
});

export const attachments_t = pgTable("attachments", {
  id: serial("id").primaryKey(),
  entity_type: text("entity_type").notNull(),
  entity_id: integer("entity_id").notNull(),
  filename: text("filename").notNull(),
  mime_type: text("mime_type").notNull(),
  size: integer("size").notNull(),
  storage_path: text("storage_path").notNull(),
  uploaded_by: text("uploaded_by").notNull().default(""),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const notifications_t = pgTable("notifications", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  entity_type: text("entity_type").notNull().default(""),
  entity_id: integer("entity_id"),
  read: boolean("read").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const sessions_t = pgTable("session", {
  // matches connect-pg-simple's default column shape
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});
