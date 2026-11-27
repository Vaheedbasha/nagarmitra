import { createApp } from "./app.js";
import { config } from "./config.js";
import { db } from "./db.js";
import { seedDatabase } from "./seed.js";

const host = process.env.HOST ?? (config.isProduction ? "0.0.0.0" : "127.0.0.1");

try {
  const result = seedDatabase();
  if (result.seeded) {
    console.log("[db] Seeded demo data and the initial administrator.");
    if (!config.isProduction) {
      console.log(`[db] Demo admin: ${config.adminEmail} / ${config.adminPassword}`);
      console.log(`[db] Demo citizen: ananya@nagarmitra.local / ${config.demoCitizenPassword}`);
    }
  }
} catch (error) {
  console.error("[db] Seeding failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}

const app = createApp();
const server = app.listen(config.port, host, () => {
  console.log(`[api] NagarMitra API listening on http://${host}:${config.port}`);
  console.log(`[api] Database: ${config.dbPath}`);
});

function shutdown(signal: string) {
  console.log(`[api] ${signal} received, shutting down.`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
