import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";
import { execute, nowIso, queryOne } from "./db.js";

export type Role = "citizen" | "official" | "admin";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: string;
  officialStatus: string | null;
  department: string | null;
  designation: string | null;
  ward: string | null;
  organisation: string | null;
  city: string | null;
  area: string | null;
  language: string;
  notifyEmail: number;
  trustScore: number;
  createdAt: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export function createSession(userId: string): { token: string; expiresAt: string } {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + config.sessionDays * 86_400_000);
  execute(
    "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    [sha256(token), userId, expires.toISOString(), nowIso()]
  );
  return { token, expiresAt: expires.toISOString() };
}

export function destroySession(token: string) {
  execute("DELETE FROM sessions WHERE token_hash = ?", [sha256(token)]);
}

export function userFromToken(token: string): SessionUser | null {
  const row = queryOne<Record<string, any>>(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
    [sha256(token), nowIso()]
  );
  if (!row || row.status !== "active") return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    officialStatus: row.official_status,
    department: row.department,
    designation: row.designation,
    ward: row.ward,
    organisation: row.organisation,
    city: row.city,
    area: row.area,
    language: row.language,
    notifyEmail: row.notify_email,
    trustScore: row.trust_score,
    createdAt: row.created_at,
  };
}

function bearer(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

/** Attaches req.user when a valid session exists; never rejects. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = bearer(req);
  if (token) {
    const user = userFromToken(token);
    if (user) req.user = user;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = bearer(req);
  const user = token ? userFromToken(token) : null;
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  req.user = user;
  next();
}

/** Operational staff: an approved official or an administrator. */
export function requireStaff(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const user = req.user!;
    if (user.role === "admin") return next();
    if (user.role === "official" && user.officialStatus === "approved") return next();
    res.status(403).json({ error: "Staff access required" });
  });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user!.role !== "admin") {
      res.status(403).json({ error: "Administrator access required" });
      return;
    }
    next();
  });
}

/** Simple fixed-window limiter; adequate for a single instance. */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(name: string, limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${name}:${req.ip}`;
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      res.status(429).json({ error: "Too many requests. Please wait and try again." });
      return;
    }
    next();
  };
}

export function publicUser(user: SessionUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    officialStatus: user.officialStatus,
    department: user.department,
    designation: user.designation,
    ward: user.ward,
    organisation: user.organisation,
    city: user.city,
    area: user.area,
    language: user.language,
    notifyEmail: Boolean(user.notifyEmail),
    trustScore: user.trustScore,
    createdAt: user.createdAt,
  };
}
