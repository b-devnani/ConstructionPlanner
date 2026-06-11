import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

const DEFAULT_DEV_URL = "postgresql://appuser:apppass@localhost:5432/constructionplanner";

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production");
  }
  console.warn(`[db] DATABASE_URL not set; falling back to ${DEFAULT_DEV_URL}`);
  return DEFAULT_DEV_URL;
}

export const pool = new Pool({
  connectionString: resolveDatabaseUrl(),
  max: 10,
});

pool.on("error", err => {
  console.error("[db] unexpected pool error:", err);
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

/**
 * Idempotent boot-time migration. Drizzle-kit's `push` covers dev, but having
 * a runtime CREATE TABLE ensures the app brings up its own schema on first
 * boot — important for the multi-instance scenario where any process may be
 * the first to connect to an empty database.
 */
export async function ensureSchema(): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'Subcontractor',
      company TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS prime_contracts (
      id SERIAL PRIMARY KEY,
      number TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      owner TEXT NOT NULL DEFAULT '',
      contractor TEXT NOT NULL DEFAULT '',
      architect TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Draft',
      executed BOOLEAN NOT NULL DEFAULT FALSE,
      contract_date DATE,
      start_date DATE,
      substantial_completion_date DATE,
      actual_completion_date DATE,
      signed_contract_received_date DATE,
      retainage_percent REAL NOT NULL DEFAULT 10,
      description TEXT NOT NULL DEFAULT '',
      inclusions TEXT NOT NULL DEFAULT '',
      exclusions TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS sov_line_items (
      id SERIAL PRIMARY KEY,
      prime_contract_id INTEGER NOT NULL,
      item_number TEXT NOT NULL DEFAULT '',
      cost_code TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      scheduled_value REAL NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS submittals (
      id SERIAL PRIMARY KEY,
      number TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 0,
      title TEXT NOT NULL,
      spec_section TEXT NOT NULL DEFAULT '',
      submittal_type TEXT NOT NULL DEFAULT 'Product Data',
      status TEXT NOT NULL DEFAULT 'Draft',
      responsible_contractor TEXT NOT NULL DEFAULT '',
      received_from TEXT NOT NULL DEFAULT '',
      submit_by TEXT NOT NULL DEFAULT '',
      ball_in_court TEXT NOT NULL DEFAULT '',
      date_submitted DATE,
      date_returned DATE,
      due_date DATE,
      lead_time_days INTEGER NOT NULL DEFAULT 0,
      required_on_site_date DATE,
      description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS submittal_steps (
      id SERIAL PRIMARY KEY,
      submittal_id INTEGER NOT NULL,
      step_number INTEGER NOT NULL,
      approver_name TEXT NOT NULL,
      approver_user_id INTEGER,
      due_date DATE,
      status TEXT NOT NULL DEFAULT 'Pending',
      comments TEXT NOT NULL DEFAULT '',
      responded_at TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS rfis (
      id SERIAL PRIMARY KEY,
      number TEXT NOT NULL,
      subject TEXT NOT NULL,
      question TEXT NOT NULL DEFAULT '',
      answer TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Draft',
      priority TEXT NOT NULL DEFAULT 'Medium',
      assigned_to TEXT NOT NULL DEFAULT '',
      rfi_manager TEXT NOT NULL DEFAULT '',
      received_from TEXT NOT NULL DEFAULT '',
      responsible_contractor TEXT NOT NULL DEFAULT '',
      spec_section TEXT NOT NULL DEFAULT '',
      drawing_number TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      cost_impact TEXT NOT NULL DEFAULT 'TBD',
      cost_impact_amount REAL NOT NULL DEFAULT 0,
      schedule_impact TEXT NOT NULL DEFAULT 'TBD',
      schedule_impact_days INTEGER NOT NULL DEFAULT 0,
      ball_in_court TEXT NOT NULL DEFAULT '',
      date_initiated DATE,
      due_date DATE,
      date_closed DATE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS drawings (
      id SERIAL PRIMARY KEY,
      number TEXT NOT NULL,
      title TEXT NOT NULL,
      discipline TEXT NOT NULL DEFAULT 'Architectural',
      revision TEXT NOT NULL DEFAULT '0',
      drawing_date DATE,
      received_date DATE,
      drawing_set TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Current',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS drawing_pins (
      id SERIAL PRIMARY KEY,
      drawing_id INTEGER NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      link_type TEXT NOT NULL DEFAULT 'note',
      linked_id INTEGER,
      note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS spec_sections (
      id SERIAL PRIMARY KEY,
      number TEXT NOT NULL,
      title TEXT NOT NULL,
      division TEXT NOT NULL,
      revision TEXT NOT NULL DEFAULT '0',
      spec_set TEXT NOT NULL DEFAULT '',
      issued_date DATE,
      received_date DATE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS daily_logs (
      id SERIAL PRIMARY KEY,
      log_date DATE NOT NULL UNIQUE,
      weather_conditions TEXT NOT NULL DEFAULT 'Clear',
      temp_high REAL,
      temp_low REAL,
      precipitation TEXT NOT NULL DEFAULT '',
      wind_speed TEXT NOT NULL DEFAULT '',
      weather_delay BOOLEAN NOT NULL DEFAULT FALSE,
      notes TEXT NOT NULL DEFAULT '',
      delays TEXT NOT NULL DEFAULT '',
      safety_notes TEXT NOT NULL DEFAULT '',
      visitors TEXT NOT NULL DEFAULT '',
      equipment_on_site TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS manpower_entries (
      id SERIAL PRIMARY KEY,
      daily_log_id INTEGER NOT NULL,
      contractor TEXT NOT NULL,
      workers INTEGER NOT NULL DEFAULT 0,
      hours REAL NOT NULL DEFAULT 0,
      location TEXT NOT NULL DEFAULT '',
      comments TEXT NOT NULL DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS punch_items (
      id SERIAL PRIMARY KEY,
      number TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Open',
      priority TEXT NOT NULL DEFAULT 'Medium',
      location TEXT NOT NULL DEFAULT '',
      trade TEXT NOT NULL DEFAULT '',
      assignee TEXT NOT NULL DEFAULT '',
      ball_in_court TEXT NOT NULL DEFAULT '',
      due_date DATE,
      date_closed DATE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS change_events (
      id SERIAL PRIMARY KEY,
      number TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open',
      scope TEXT NOT NULL DEFAULT 'TBD',
      event_type TEXT NOT NULL DEFAULT 'Owner Change',
      origin TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS change_event_line_items (
      id SERIAL PRIMARY KEY,
      change_event_id INTEGER NOT NULL,
      cost_code TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      vendor TEXT NOT NULL DEFAULT '',
      rom_amount REAL NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS change_orders (
      id SERIAL PRIMARY KEY,
      number TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Draft',
      change_event_id INTEGER,
      description TEXT NOT NULL DEFAULT '',
      schedule_impact_days INTEGER NOT NULL DEFAULT 0,
      executed BOOLEAN NOT NULL DEFAULT FALSE,
      signed_date DATE,
      date_created DATE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS change_order_line_items (
      id SERIAL PRIMARY KEY,
      change_order_id INTEGER NOT NULL,
      cost_code TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS budget_line_items (
      id SERIAL PRIMARY KEY,
      cost_code TEXT NOT NULL,
      description TEXT NOT NULL,
      original_budget REAL NOT NULL DEFAULT 0,
      budget_modifications REAL NOT NULL DEFAULT 0,
      committed_costs REAL NOT NULL DEFAULT 0,
      direct_costs REAL NOT NULL DEFAULT 0,
      pending_budget_changes REAL NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS commitments (
      id SERIAL PRIMARY KEY,
      number TEXT NOT NULL,
      title TEXT NOT NULL,
      commitment_type TEXT NOT NULL DEFAULT 'Subcontract',
      status TEXT NOT NULL DEFAULT 'Draft',
      vendor TEXT NOT NULL DEFAULT '',
      executed_date DATE,
      retainage_percent REAL NOT NULL DEFAULT 10,
      description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS commitment_line_items (
      id SERIAL PRIMARY KEY,
      commitment_id INTEGER NOT NULL,
      cost_code TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS owner_invoices (
      id SERIAL PRIMARY KEY,
      number TEXT NOT NULL,
      period_start DATE,
      period_end DATE NOT NULL,
      billing_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'Draft',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS invoice_line_items (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER NOT NULL,
      sov_line_item_id INTEGER NOT NULL,
      work_this_period REAL NOT NULL DEFAULT 0,
      stored_materials REAL NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS attachments (
      id SERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      uploaded_by TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      entity_type TEXT NOT NULL DEFAULT '',
      entity_id INTEGER,
      read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS session (
      sid TEXT PRIMARY KEY,
      sess JSONB NOT NULL,
      expire TIMESTAMP(6) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS activity_events (
      id SERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      summary TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      actor TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS activity_events_entity_idx ON activity_events (entity_type, entity_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS session_expire_idx ON session (expire)`,
    `CREATE INDEX IF NOT EXISTS attachments_entity_idx ON attachments (entity_type, entity_id)`,
    `CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id)`,
    `CREATE INDEX IF NOT EXISTS submittal_steps_submittal_idx ON submittal_steps (submittal_id)`,
    `CREATE INDEX IF NOT EXISTS drawing_pins_drawing_idx ON drawing_pins (drawing_id)`,
    `CREATE INDEX IF NOT EXISTS commitment_line_items_commitment_idx ON commitment_line_items (commitment_id)`,
    `CREATE INDEX IF NOT EXISTS change_event_line_items_event_idx ON change_event_line_items (change_event_id)`,
    `CREATE INDEX IF NOT EXISTS change_order_line_items_order_idx ON change_order_line_items (change_order_id)`,
    `CREATE INDEX IF NOT EXISTS manpower_entries_log_idx ON manpower_entries (daily_log_id)`,
    `CREATE INDEX IF NOT EXISTS invoice_line_items_invoice_idx ON invoice_line_items (invoice_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedup_idx
       ON notifications (user_id, entity_type, entity_id, title)
       WHERE entity_type <> '' AND entity_id IS NOT NULL`,
  ];

  for (const sql of statements) {
    await pool.query(sql);
  }
}

export async function closeDb(): Promise<void> {
  await pool.end();
}
