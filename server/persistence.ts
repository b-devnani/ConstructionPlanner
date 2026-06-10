import fs from "fs";
import path from "path";
import { Pool } from "pg";

/**
 * Snapshot persistence for ProcoreStorage.
 *
 * All business logic lives in ProcoreStorage operating on in-memory maps; this
 * layer durably stores those collections so data survives restarts.
 *
 * Two backends:
 *  - PgSnapshotStore  — used when DATABASE_URL is set. Stores each collection
 *    as a JSONB row in the app_state table (see shared/schema.ts; provision
 *    with `npm run db:push`).
 *  - FileSnapshotStore — zero-config default; writes data/procore-data.json.
 */

export type Snapshot = Record<string, unknown>;

export interface SnapshotStore {
  load(): Promise<Snapshot | null>;
  save(snapshot: Snapshot): Promise<void>;
  describe(): string;
}

export class FileSnapshotStore implements SnapshotStore {
  constructor(private filePath: string) {}

  async load(): Promise<Snapshot | null> {
    try {
      const raw = await fs.promises.readFile(this.filePath, "utf-8");
      return JSON.parse(raw) as Snapshot;
    } catch (error: any) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }

  async save(snapshot: Snapshot): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    await fs.promises.writeFile(tmp, JSON.stringify(snapshot), "utf-8");
    await fs.promises.rename(tmp, this.filePath);
  }

  describe(): string {
    return `file (${this.filePath})`;
  }
}

export class PgSnapshotStore implements SnapshotStore {
  private pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  private async ensureTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  async load(): Promise<Snapshot | null> {
    await this.ensureTable();
    const result = await this.pool.query<{ key: string; data: unknown }>(
      "SELECT key, data FROM app_state",
    );
    if (result.rows.length === 0) return null;
    const snapshot: Snapshot = {};
    for (const row of result.rows) {
      snapshot[row.key] = row.data;
    }
    return snapshot;
  }

  async save(snapshot: Snapshot): Promise<void> {
    await this.ensureTable();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const [key, data] of Object.entries(snapshot)) {
        await client.query(
          `INSERT INTO app_state (key, data, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET data = $2, updated_at = NOW()`,
          [key, JSON.stringify(data)],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  describe(): string {
    return "postgresql (app_state table)";
  }
}

export function createSnapshotStore(): SnapshotStore {
  if (process.env.DATABASE_URL) {
    return new PgSnapshotStore(process.env.DATABASE_URL);
  }
  return new FileSnapshotStore(path.resolve(process.cwd(), "data", "procore-data.json"));
}

/** Debounces persistence so bursts of mutations produce a single write. */
export class PersistenceManager {
  private timer: NodeJS.Timeout | null = null;
  private saving = false;
  private dirty = false;

  constructor(
    private store: SnapshotStore,
    private getSnapshot: () => Snapshot,
    private delayMs = 250,
  ) {}

  schedule(): void {
    this.dirty = true;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.delayMs);
  }

  async flush(): Promise<void> {
    if (this.saving) {
      // a save is running; mark dirty so it re-runs after
      this.dirty = true;
      return;
    }
    while (this.dirty) {
      this.dirty = false;
      this.saving = true;
      try {
        await this.store.save(this.getSnapshot());
      } catch (error) {
        console.error("Failed to persist snapshot:", error);
      } finally {
        this.saving = false;
      }
    }
  }
}
