import fs from "node:fs";
import path from "node:path";

/** All server paths are resolved from the repository root, so run commands from there. */
export const ROOT = process.cwd();

function loadEnvFile(file: string) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(path.join(ROOT, ".env"));

const env = process.env;
const isProduction = env.NODE_ENV === "production";
const isVercel = Boolean(env.VERCEL);
const requestedPort = Number(env.PORT);
const port = Number.isFinite(requestedPort) && requestedPort > 0 ? requestedPort : 8787;

function resolvePath(value: string | undefined, fallback: string) {
  const target = value?.trim() || fallback;
  return path.isAbsolute(target) ? target : path.join(ROOT, target);
}

export const config = {
  isProduction,
  port,
  dbPath: resolvePath(env.DATABASE_PATH, isVercel ? "/tmp/nagarmitra.db" : "server/data/nagarmitra.db"),
  uploadDir: resolvePath(env.UPLOAD_DIR, isVercel ? "/tmp/uploads" : "server/uploads"),
  corsOrigins: (env.CORS_ORIGIN ?? "http://127.0.0.1:5173,http://localhost:5173,https://nagarmitra-sable.vercel.app")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  sessionDays: Number(env.SESSION_DAYS ?? 7),
  /** Seeded administrator. In production ADMIN_PASSWORD is required. */
  adminEmail: (env.ADMIN_EMAIL ?? "admin@nagarmitra.local").toLowerCase(),
  adminPassword: env.ADMIN_PASSWORD || "Admin@12345",
  demoCitizenPassword: env.DEMO_CITIZEN_PASSWORD ?? "Citizen@12345",
  ai: {
    apiKey: env.AI_API_KEY ?? "",
    baseUrl: (env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, ""),
    model: env.AI_MODEL ?? "gpt-4o-mini",
    timeoutMs: Number(env.AI_TIMEOUT_MS ?? 20000),
  },
  media: {
    maxImageBytes: Number(env.MAX_IMAGE_BYTES ?? 8 * 1024 * 1024),
    maxVideoBytes: Number(env.MAX_VIDEO_BYTES ?? 40 * 1024 * 1024),
  },
  email: {
    resendApiKey: env.RESEND_API_KEY ?? "",
    fromEmail: env.MAIL_FROM_ADDRESS ?? env.RESEND_FROM_EMAIL ?? "NagarMitra <vaheedbasha544@gmail.com>",
    smtp: {
      host: env.MAIL_HOST ?? env.SMTP_HOST ?? "smtp.gmail.com",
      port: Number(env.MAIL_PORT ?? env.SMTP_PORT ?? 587),
      secure: env.MAIL_PORT === "465" || env.MAIL_ENCRYPTION === "ssl",
      user: env.MAIL_USERNAME ?? env.SMTP_USER ?? env.GMAIL_USER ?? "vaheedbasha544@gmail.com",
      pass: env.MAIL_PASSWORD ?? env.SMTP_PASS ?? env.SMTP_PASSWORD ?? env.GMAIL_APP_PASSWORD ?? "ssay zkpi fkfm zjhx",
      from: env.MAIL_FROM_ADDRESS ?? "NagarMitra <vaheedbasha544@gmail.com>",
    },
  },
  publicAppUrl: env.PUBLIC_APP_URL ?? (isVercel ? "https://nagarmitra-sable.vercel.app" : "http://127.0.0.1:5173"),
} as const;

export const isAiConfigured = () => Boolean(config.ai.apiKey && config.ai.model);
export const isEmailConfigured = () => Boolean(config.email.resendApiKey);
