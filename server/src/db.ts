import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { config } from "./config.js";

let dbInstance: DatabaseSync | null = null;

function initSchema(database: DatabaseSync) {
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec("PRAGMA busy_timeout = 5000;");

  database.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('citizen','official','admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  official_status TEXT CHECK (official_status IN ('pending','approved','rejected')),
  department TEXT,
  designation TEXT,
  ward TEXT,
  organisation TEXT,
  city TEXT,
  area TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  notify_email INTEGER NOT NULL DEFAULT 1,
  email_verified INTEGER NOT NULL DEFAULT 0,
  trust_score INTEGER NOT NULL DEFAULT 70,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS email_verifications (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  ai_summary TEXT NOT NULL DEFAULT '',
  ai_source TEXT NOT NULL DEFAULT 'rule-based',
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('submitted','review','progress','resolved')),
  priority TEXT NOT NULL CHECK (priority IN ('low','medium','high','critical')),
  score INTEGER NOT NULL,
  factors_json TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  address TEXT NOT NULL,
  area TEXT NOT NULL,
  ward TEXT,
  city TEXT NOT NULL,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  base_upvotes INTEGER NOT NULL DEFAULT 0,
  photo TEXT,
  video TEXT,
  why_json TEXT NOT NULL DEFAULT '[]',
  resolution_note TEXT,
  escalated_to TEXT,
  escalation_sla TEXT,
  escalation_note TEXT,
  assigned_department TEXT,
  assigned_official TEXT,
  assigned_at TEXT,
  sla_due TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS timeline (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  label TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  done INTEGER NOT NULL DEFAULT 0,
  current INTEGER NOT NULL DEFAULT 0,
  seq INTEGER NOT NULL,
  at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS confirmations (
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (complaint_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  badge TEXT NOT NULL DEFAULT 'Citizen',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_decisions (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  admin_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  decision TEXT NOT NULL CHECK (decision IN ('approved','field_check','rejected')),
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  complaint_id TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  read_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  complaint_id TEXT REFERENCES complaints(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('photo','video')),
  filename TEXT NOT NULL UNIQUE,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  original_name TEXT NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_complaints_city ON complaints(city);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_reporter ON complaints(reporter_id);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_complaint ON timeline(complaint_id, seq);
CREATE INDEX IF NOT EXISTS idx_comments_complaint ON comments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_media_complaint ON media(complaint_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

-- Automatic migration to real Indian cities
UPDATE complaints SET city = 'Hyderabad' WHERE city = 'Riverton' OR city IS NULL;
UPDATE complaints SET description = REPLACE(description, 'Riverton', 'Hyderabad') WHERE description LIKE '%Riverton%';
UPDATE complaints SET location = REPLACE(location, 'Riverton', 'Hyderabad') WHERE location LIKE '%Riverton%';
UPDATE complaints SET title = REPLACE(title, 'Riverton', 'Hyderabad') WHERE title LIKE '%Riverton%';
UPDATE users SET city = 'Hyderabad' WHERE city = 'Riverton' OR city IS NULL;
UPDATE users SET organisation = 'Greater Hyderabad Municipal Corporation (GHMC)' WHERE organisation LIKE '%Riverton%';
UPDATE users SET email_verified = 1 WHERE role = 'admin' OR email = 'ananya@nagarmitra.local';
`);

  try {
    database.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;");
  } catch {}
}

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
    fs.mkdirSync(config.uploadDir, { recursive: true });
    dbInstance = new DatabaseSync(config.dbPath);
    initSchema(dbInstance);
  }
  return dbInstance;
}

export function reopenDb(): DatabaseSync {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;
  }
  return getDb();
}

export const db: DatabaseSync = new Proxy({} as DatabaseSync, {
  get(_target, prop) {
    const instance = getDb();
    const value = (instance as any)[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export const nowIso = () => new Date().toISOString();
export const today = () => nowIso().slice(0, 10);
export const uid = () => randomUUID();

export function checkpointDatabase() {
  try {
    db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
  } catch (e) {
    console.warn("[db] Checkpoint notice:", e);
  }
}

export function queryAll<T = Record<string, unknown>>(
  sql: string,
  params: SQLInputValue[] = []
): T[] {
  return db.prepare(sql).all(...params) as unknown as T[];
}

export function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: SQLInputValue[] = []
): T | undefined {
  return db.prepare(sql).get(...params) as unknown as T | undefined;
}

export function execute(sql: string, params: SQLInputValue[] = []) {
  return db.prepare(sql).run(...params);
}

export function transaction<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/** Sequential, human-readable complaint identifier, e.g. CF-2026-0148. */
export function nextComplaintId(): string {
  const year = new Date().getFullYear();
  const name = `complaint-${year}`;
  const row = queryOne<{ value: number }>("SELECT value FROM counters WHERE name = ?", [name]);
  const next = (row?.value ?? 147) + 1;
  execute(
    "INSERT INTO counters (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value",
    [name, next]
  );
  return `CF-${year}-${String(next).padStart(4, "0")}`;
}
