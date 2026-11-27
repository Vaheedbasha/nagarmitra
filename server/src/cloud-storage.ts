import fs from "node:fs";
import path from "node:path";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { config } from "./config.js";
import { checkpointDatabase } from "./db.js";

let sqlClient: NeonQueryFunction<false, false> | null = null;
let syncTimeout: NodeJS.Timeout | null = null;
let isSyncing = false;
let pendingSync = false;

let localSnapshotTimestamp: string | null = null;

const DEFAULT_NEON_URL =
  "postgresql://neondb_owner:npg_Uj1GNHu7wlTk@ep-young-mountain-bb37bsyo-pooler.c-15.us-east-1.aws.neon.tech/neondb?sslmode=require";

function getPostgresUrl(): string | null {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
  if (url && (url.startsWith("postgres://") || url.startsWith("postgresql://"))) {
    return url;
  }
  if (process.env.VERCEL) {
    return DEFAULT_NEON_URL;
  }
  return null;
}

export function isCloudConfigured(): boolean {
  return Boolean(getPostgresUrl());
}

function getSql(): NeonQueryFunction<false, false> | null {
  if (!sqlClient) {
    const url = getPostgresUrl();
    if (url) {
      sqlClient = neon(url);
    }
  }
  return sqlClient;
}

/**
 * On cold start: fetch the latest SQLite snapshot from Neon Postgres
 * and write it to disk so SQLite starts with all existing users and complaints.
 */
export async function initCloudStorage(): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;

  try {
    // Ensure table exists in Neon
    await sql`
      CREATE TABLE IF NOT EXISTS nagarmitra_db_store (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Check for existing snapshot
    const rows = await sql`
      SELECT content, updated_at FROM nagarmitra_db_store WHERE id = 'primary' LIMIT 1
    `;

    if (rows && rows.length > 0 && rows[0].content) {
      const base64Data = rows[0].content as string;
      const buffer = Buffer.from(base64Data, "base64");
      fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
      fs.writeFileSync(config.dbPath, buffer);
      localSnapshotTimestamp = rows[0].updated_at ? new Date(rows[0].updated_at).toISOString() : new Date().toISOString();
      console.log(`[cloud-storage] Restored SQLite database from Neon (${buffer.length} bytes, updated: ${localSnapshotTimestamp})`);
      return true;
    }

    console.log("[cloud-storage] Connected to Neon. No existing database snapshot found; will initialize fresh.");
    return false;
  } catch (error) {
    console.error("[cloud-storage] Error initializing cloud storage:", error);
    return false;
  }
}

/**
 * Check if another serverless container has pushed a newer snapshot to Neon,
 * and if so, pull and reopen the local SQLite database.
 */
export async function refreshIfNewer(): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;

  try {
    const rows = await sql`
      SELECT content, updated_at FROM nagarmitra_db_store WHERE id = 'primary' LIMIT 1
    `;
    if (!rows || rows.length === 0 || !rows[0].content) return false;
    const remoteIso = rows[0].updated_at ? new Date(rows[0].updated_at).toISOString() : null;

    if (!localSnapshotTimestamp || (remoteIso && remoteIso > localSnapshotTimestamp)) {
      const base64Data = rows[0].content as string;
      const buffer = Buffer.from(base64Data, "base64");
      fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
      fs.writeFileSync(config.dbPath, buffer);
      localSnapshotTimestamp = remoteIso;
      const { reopenDb } = await import("./db.js");
      reopenDb();
      console.log(`[cloud-storage] Refreshed newer SQLite snapshot from Neon (${buffer.length} bytes, timestamp: ${remoteIso})`);
      return true;
    }
    return false;
  } catch (error) {
    console.error("[cloud-storage] Error checking/refreshing newer snapshot:", error);
    return false;
  }
}

/**
 * Save the local SQLite database file to Neon Postgres.
 */
export async function syncCloudDatabase(): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  if (isSyncing) {
    pendingSync = true;
    return;
  }

  isSyncing = true;
  try {
    checkpointDatabase();
    if (fs.existsSync(config.dbPath)) {
      const buffer = fs.readFileSync(config.dbPath);
      const base64 = buffer.toString("base64");
      const nowIso = new Date().toISOString();

      await sql`
        INSERT INTO nagarmitra_db_store (id, content, updated_at)
        VALUES ('primary', ${base64}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          updated_at = NOW()
      `;
      localSnapshotTimestamp = nowIso;
      console.log(`[cloud-storage] Synced SQLite snapshot to Neon (${buffer.length} bytes)`);
    }
  } catch (error) {
    console.error("[cloud-storage] Error syncing database to Neon:", error);
  } finally {
    isSyncing = false;
    if (pendingSync) {
      pendingSync = false;
      void syncCloudDatabase();
    }
  }
}

/**
 * Debounced sync helper for frequent write events.
 */
export function queueCloudSync(delayMs = 150): void {
  if (!isCloudConfigured()) return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    void syncCloudDatabase();
  }, delayMs);
}
