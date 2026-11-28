import { Router } from "express";
import { createHash, randomBytes } from "node:crypto";
import {
  createSession,
  destroySession,
  hashPassword,
  optionalAuth,
  publicUser,
  requireAuth,
  verifyPassword,
  type SessionUser,
} from "../auth.js";
import { config } from "../config.js";
import { db, execute, nowIso, queryOne, uid } from "../db.js";
import { isCloudConfigured, refreshIfNewer, syncCloudDatabase } from "../cloud-storage.js";
import { notifyStaff, notifyUser } from "../notifications.js";
import { sendVerificationEmail } from "../email.js";
import {
  bad,
  isEmail,
  isPhone,
  normalisePhone,
  passwordProblem,
  text,
} from "../validate.js";

export const authRouter = Router();

const LANGS = ["en", "hi", "te"];
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

function readSessionUser(id: string): SessionUser {
  const row = queryOne<Record<string, any>>("SELECT * FROM users WHERE id = ?", [id])!;
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
    emailVerified: Boolean(row.email_verified),
    trustScore: row.trust_score,
    createdAt: row.created_at,
  };
}

authRouter.post("/register", async (req, res) => {
  const name = text(req.body?.name, 80);
  const email = text(req.body?.email, 160).toLowerCase();
  const phone = normalisePhone(text(req.body?.phone, 24));
  const password = text(req.body?.password, 200);
  const city = text(req.body?.city, 80) || "Hyderabad";
  const area = text(req.body?.area, 120);
  const language = LANGS.includes(text(req.body?.language, 2)) ? text(req.body?.language, 2) : "en";

  if (name.length < 2) return bad(res, 400, "Please enter your full name.");
  if (!isEmail(email)) return bad(res, 400, "Please enter a valid email address.");
  if (!isPhone(phone)) return bad(res, 400, "Please enter a valid phone number.");
  const problem = passwordProblem(password);
  if (problem) return bad(res, 400, problem);

  if (queryOne("SELECT 1 FROM users WHERE email = ?", [email]))
    return bad(res, 409, "An account with this email already exists.");
  if (queryOne("SELECT 1 FROM users WHERE phone = ?", [phone]))
    return bad(res, 409, "An account with this phone number already exists.");

  const id = uid();
  const at = nowIso();
  try {
    execute(
      `INSERT INTO users (id, name, email, phone, password_hash, role, city, area, language, email_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'citizen', ?, ?, ?, 0, ?, ?)`,
      [id, name, email, phone, hashPassword(password), city, area, language, at, at]
    );
  } catch {
    try {
      db.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;");
    } catch {}
    execute(
      `INSERT INTO users (id, name, email, phone, password_hash, role, city, area, language, email_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'citizen', ?, ?, ?, 0, ?, ?)`,
      [id, name, email, phone, hashPassword(password), city, area, language, at, at]
    );
  }

  const verifyToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 24 * 3600_000).toISOString();
  try {
    execute(
      `INSERT INTO email_verifications (token_hash, user_id, email, expires_at, used, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [sha256(verifyToken), id, email, expiresAt, at]
    );
  } catch {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS email_verifications (
          token_hash TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          used INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
      `);
    } catch {}
    execute(
      `INSERT INTO email_verifications (token_hash, user_id, email, expires_at, used, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [sha256(verifyToken), id, email, expiresAt, at]
    );
  }

  let emailResult = { sent: false, previewUrl: "" };
  try {
    emailResult = await sendVerificationEmail({
      name,
      email,
      token: verifyToken,
      city,
    });
  } catch (emailErr) {
    console.warn("[auth] Failed to dispatch verification email:", emailErr);
  }

  const session = createSession(id);
  if (isCloudConfigured()) {
    try {
      await syncCloudDatabase();
    } catch (e) {
      console.warn("[auth] register sync error:", e);
    }
  }
  res.status(201).json({
    token: session.token,
    expiresAt: session.expiresAt,
    user: publicUser(readSessionUser(id)),
    emailSent: emailResult.sent,
    previewUrl: emailResult.previewUrl,
  });
});

/** Officials request access; they do not receive staff permissions until approved. */
authRouter.post("/register-official", async (req, res) => {
  const name = text(req.body?.name, 80);
  const email = text(req.body?.email, 160).toLowerCase();
  const phone = normalisePhone(text(req.body?.phone, 24));
  const password = text(req.body?.password, 200);
  const department = text(req.body?.department, 120);
  const designation = text(req.body?.designation, 120);
  const ward = text(req.body?.ward, 80);
  const organisation = text(req.body?.organisation, 160);
  const city = text(req.body?.city, 80) || "Hyderabad";

  if (name.length < 2) return bad(res, 400, "Please enter your full name.");
  if (!isEmail(email)) return bad(res, 400, "Please enter a valid official email address.");
  if (!isPhone(phone)) return bad(res, 400, "Please enter a valid phone number.");
  if (!department || !designation) return bad(res, 400, "Department and designation are required.");
  const problem = passwordProblem(password);
  if (problem) return bad(res, 400, problem);

  if (queryOne("SELECT 1 FROM users WHERE email = ?", [email]))
    return bad(res, 409, "An account with this email already exists.");
  if (queryOne("SELECT 1 FROM users WHERE phone = ?", [phone]))
    return bad(res, 409, "An account with this phone number already exists.");

  const id = uid();
  const at = nowIso();
  execute(
    `INSERT INTO users (id, name, email, phone, password_hash, role, official_status, department, designation, ward, organisation, city, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'official', 'pending', ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, email, phone, hashPassword(password), department, designation, ward, organisation, city, at, at]
  );

  notifyStaff({
    type: "official_request",
    title: "Official access request",
    body: `${name} (${department}) requested municipal staff access and is awaiting approval.`,
  });

  if (isCloudConfigured()) {
    try {
      await syncCloudDatabase();
    } catch (e) {
      console.warn("[auth] register-official sync error:", e);
    }
  }

  res.status(201).json({
    status: "pending",
    message: "Request submitted. An administrator must approve this account before staff access is granted.",
  });
});

authRouter.post("/login", async (req, res) => {
  if (isCloudConfigured()) {
    try {
      await refreshIfNewer();
    } catch (e) {
      console.warn("[auth] login refresh error:", e);
    }
  }
  const identifier = text(req.body?.identifier, 160).toLowerCase();
  const password = text(req.body?.password, 200);
  if (!identifier || !password) return bad(res, 400, "Enter your email or phone and password.");

  let row = queryOne<Record<string, any>>(
    "SELECT * FROM users WHERE email = ? OR phone = ?",
    [identifier, normalisePhone(identifier)]
  );
  if (!row && isCloudConfigured()) {
    // If not found in local container, check if another container created this user
    await refreshIfNewer();
    row = queryOne<Record<string, any>>(
      "SELECT * FROM users WHERE email = ? OR phone = ?",
      [identifier, normalisePhone(identifier)]
    );
  }
  if (!row || !verifyPassword(password, row.password_hash)) {
    return bad(res, 401, "Incorrect email/phone or password.");
  }
  if (row.status !== "active") return bad(res, 403, "This account is suspended. Contact support.");

  const session = createSession(row.id);
  const user = readSessionUser(row.id);
  if (isCloudConfigured()) {
    try {
      await syncCloudDatabase();
    } catch (e) {
      console.warn("[auth] login session sync error:", e);
    }
  }
  res.json({
    token: session.token,
    expiresAt: session.expiresAt,
    user: publicUser(user),
    pendingApproval: user.role === "official" && user.officialStatus !== "approved",
  });
});

authRouter.post("/logout", requireAuth, async (req, res) => {
  const header = req.headers.authorization ?? "";
  destroySession(header.replace("Bearer ", "").trim());
  if (isCloudConfigured()) {
    try {
      await syncCloudDatabase();
    } catch (e) {
      console.warn("[auth] logout session sync error:", e);
    }
  }
  res.json({ ok: true });
});

authRouter.get("/me", optionalAuth, (req, res) => {
  if (!req.user) return bad(res, 401, "Authentication required");
  res.json({ user: publicUser(req.user) });
});

authRouter.patch("/me", requireAuth, async (req, res) => {
  const updates: string[] = [];
  const values: (string | number)[] = [];
  const name = text(req.body?.name, 80);
  const language = text(req.body?.language, 2);
  const city = text(req.body?.city, 80);
  const area = text(req.body?.area, 120);
  const phone = req.body?.phone ? normalisePhone(text(req.body.phone, 24)) : "";

  if (name) {
    if (name.length < 2) return bad(res, 400, "Please enter your full name.");
    updates.push("name = ?");
    values.push(name);
  }
  if (language) {
    if (!LANGS.includes(language)) return bad(res, 400, "Unsupported language.");
    updates.push("language = ?");
    values.push(language);
  }
  if (city) {
    updates.push("city = ?");
    values.push(city);
  }
  if (area) {
    updates.push("area = ?");
    values.push(area);
  }
  if (phone) {
    if (!isPhone(phone)) return bad(res, 400, "Please enter a valid phone number.");
    if (queryOne("SELECT 1 FROM users WHERE phone = ? AND id <> ?", [phone, req.user!.id]))
      return bad(res, 409, "That phone number is already in use.");
    updates.push("phone = ?");
    values.push(phone);
  }
  if (typeof req.body?.notifyEmail === "boolean") {
    updates.push("notify_email = ?");
    values.push(req.body.notifyEmail ? 1 : 0);
  }
  if (!updates.length) return bad(res, 400, "No supported fields supplied.");

  updates.push("updated_at = ?");
  values.push(nowIso());
  execute(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, [...values, req.user!.id]);
  if (isCloudConfigured()) {
    try {
      await syncCloudDatabase();
    } catch (e) {
      console.warn("[auth] patch me sync error:", e);
    }
  }
  res.json({ user: publicUser(readSessionUser(req.user!.id)) });
});

authRouter.post("/change-password", requireAuth, async (req, res) => {
  const current = text(req.body?.currentPassword, 200);
  const next = text(req.body?.newPassword, 200);
  const row = queryOne<Record<string, any>>("SELECT password_hash FROM users WHERE id = ?", [req.user!.id]);
  if (!row || !verifyPassword(current, row.password_hash))
    return bad(res, 401, "Current password is incorrect.");
  const problem = passwordProblem(next);
  if (problem) return bad(res, 400, problem);

  execute("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", [
    hashPassword(next),
    nowIso(),
    req.user!.id,
  ]);
  execute("DELETE FROM sessions WHERE user_id = ?", [req.user!.id]);
  const session = createSession(req.user!.id);
  if (isCloudConfigured()) {
    try {
      await syncCloudDatabase();
    } catch (e) {
      console.warn("[auth] change password sync error:", e);
    }
  }
  res.json({ ok: true, token: session.token });
});

/**
 * Password recovery. Email delivery is not configured in this deployment, so a token is
 * returned only outside production and shown once. In production, configure an email
 * provider (see README) before relying on this route.
 */
authRouter.post("/forgot-password", (req, res) => {
  const email = text(req.body?.email, 160).toLowerCase();
  if (!isEmail(email)) return bad(res, 400, "Enter a valid email address.");
  const row = queryOne<{ id: string }>("SELECT id FROM users WHERE email = ?", [email]);
  if (!row) {
    return res.json({ ok: true, message: "If that email exists, a reset link has been issued." });
  }
  const token = randomBytes(24).toString("base64url");
  execute(
    "INSERT INTO password_resets (token_hash, user_id, expires_at, used) VALUES (?, ?, ?, 0)",
    [sha256(token), row.id, new Date(Date.now() + 30 * 60_000).toISOString()]
  );
  res.json({
    ok: true,
    message: config.isProduction
      ? "If that email exists, a reset link has been issued."
      : "Development mode: email is not configured, so the reset token is returned here.",
    ...(config.isProduction ? {} : { token }),
  });
});

authRouter.post("/reset-password", async (req, res) => {
  const token = text(req.body?.token, 200);
  const password = text(req.body?.password, 200);
  const problem = passwordProblem(password);
  if (problem) return bad(res, 400, problem);

  const row = queryOne<{ user_id: string }>(
    "SELECT user_id FROM password_resets WHERE token_hash = ? AND used = 0 AND expires_at > ?",
    [sha256(token), nowIso()]
  );
  if (!row) return bad(res, 400, "This reset link is invalid or expired.");

  execute("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", [
    hashPassword(password),
    nowIso(),
    row.user_id,
  ]);
  execute("UPDATE password_resets SET used = 1 WHERE token_hash = ?", [sha256(token)]);
  execute("DELETE FROM sessions WHERE user_id = ?", [row.user_id]);
  if (isCloudConfigured()) {
    try {
      await syncCloudDatabase();
    } catch (e) {
      console.warn("[auth] reset-password sync error:", e);
    }
  }
  res.json({ ok: true });
});

authRouter.get("/official-status", requireAuth, (req, res) => {
  res.json({ role: req.user!.role, officialStatus: req.user!.officialStatus });
});

authRouter.get("/verify-email", async (req, res) => {
  const token = text(req.query?.token as string, 200);
  if (!token) return bad(res, 400, "Verification token is required.");
  const tokenHash = sha256(token);

  if (isCloudConfigured()) {
    try {
      await refreshIfNewer();
    } catch (e) {
      console.warn("[auth] verify-email refresh error:", e);
    }
  }

  const record = queryOne<{ user_id: string; email: string; expires_at: string; used: number }>(
    "SELECT user_id, email, expires_at, used FROM email_verifications WHERE token_hash = ?",
    [tokenHash]
  );

  if (!record) {
    return bad(res, 400, "This verification link is invalid or has already been replaced.");
  }

  if (record.used) {
    const user = readSessionUser(record.user_id);
    const session = createSession(record.user_id);
    return res.json({
      ok: true,
      alreadyVerified: true,
      message: "Your email has already been verified.",
      token: session.token,
      user: user ? publicUser(user) : undefined,
    });
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    return bad(res, 400, "This verification link has expired. Please request a new verification email.");
  }

  execute("UPDATE email_verifications SET used = 1 WHERE token_hash = ?", [tokenHash]);
  execute("UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?", [nowIso(), record.user_id]);

  if (isCloudConfigured()) {
    try {
      await syncCloudDatabase();
    } catch (e) {
      console.warn("[auth] verify-email sync error:", e);
    }
  }

  const user = readSessionUser(record.user_id);
  const session = createSession(record.user_id);
  res.json({
    ok: true,
    message: "Email verified successfully! Your account is now fully active.",
    token: session.token,
    user: publicUser(user),
  });
});

authRouter.post("/resend-verification", optionalAuth, async (req, res) => {
  const emailInput = req.body?.email ? text(req.body.email, 160).toLowerCase() : undefined;
  const targetEmail = req.user?.email || emailInput;

  if (!targetEmail || !isEmail(targetEmail)) {
    return bad(res, 400, "Please provide a valid email address.");
  }

  if (isCloudConfigured()) {
    try {
      await refreshIfNewer();
    } catch (e) {
      console.warn("[auth] resend refresh error:", e);
    }
  }

  const user = queryOne<Record<string, any>>("SELECT * FROM users WHERE email = ?", [targetEmail]);
  if (!user) {
    return res.json({ ok: true, message: "If that account exists, a new verification link was sent." });
  }

  if (user.email_verified) {
    return res.json({ ok: true, alreadyVerified: true, message: "This email address is already verified." });
  }

  const verifyToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 24 * 3600_000).toISOString();
  const at = nowIso();

  execute(
    `INSERT INTO email_verifications (token_hash, user_id, email, expires_at, used, created_at)
     VALUES (?, ?, ?, ?, 0, ?)`,
    [sha256(verifyToken), user.id, user.email, expiresAt, at]
  );

  let emailResult = { sent: false, previewUrl: "" };
  try {
    emailResult = await sendVerificationEmail({
      name: user.name,
      email: user.email,
      token: verifyToken,
      city: user.city || undefined,
    });
  } catch (err) {
    console.warn("[auth] resend email dispatch error:", err);
  }

  if (isCloudConfigured()) {
    try {
      await syncCloudDatabase();
    } catch (e) {
      console.warn("[auth] resend sync error:", e);
    }
  }

  res.json({
    ok: true,
    emailSent: emailResult.sent,
    previewUrl: emailResult.previewUrl,
    message: "A new verification link has been dispatched to your email.",
  });
});
