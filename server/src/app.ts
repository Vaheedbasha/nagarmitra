import express from "express";
import fs from "node:fs";
import path from "node:path";
import { config, ROOT } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { complaintRouter } from "./routes/complaints.js";
import { adminRouter } from "./routes/admin.js";
import { miscRouter } from "./routes/misc.js";
import { checkpointDatabase } from "./db.js";
import { isCloudConfigured, refreshIfNewer, syncCloudDatabase } from "./cloud-storage.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  // Explicit CORS allow-list. Requests without an Origin (curl, server-to-server) are allowed.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && config.corsOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
      res.setHeader("Access-Control-Max-Age", "600");
    } else if (origin) {
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(origin && config.corsOrigins.includes(origin) ? 204 : 403);
      return;
    }
    next();
  });

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    next();
  });

  app.use(express.json({ limit: "1mb" }));

  // Cloud persistence middleware: refresh before mutation, checkpoint SQLite and await Neon sync before completing response
  app.use(async (req, res, next) => {
    if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method) && isCloudConfigured()) {
      try {
        await refreshIfNewer();
      } catch (err) {
        console.warn("[cloud-storage] Pre-mutation sync warning:", err);
      }
      const originalEnd = res.end.bind(res);
      res.end = function (...args: any[]) {
        if (res.statusCode < 400 && isCloudConfigured()) {
          checkpointDatabase();
          void syncCloudDatabase()
            .catch((err) => console.error("[cloud-storage] Sync on response error:", err))
            .finally(() => {
              originalEnd(...args);
            });
          return res;
        }
        return originalEnd(...args);
      } as any;
    }
    next();
  });

  app.use("/api/auth", authRouter);
  app.use("/api/complaints", complaintRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api", miscRouter);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Endpoint not found" });
  });

  // Production: serve the built SPA with history fallback so nested routes never 404.
  const dist = path.join(ROOT, "dist");
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: "1h" }));
    app.use((req, res, next) => {
      if (req.method !== "GET" || !req.accepts("html")) return next();
      res.sendFile(path.join(dist, "index.html"));
    });
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    const isUploadError = message.includes("Only JPEG") || message.includes("File too large");
    if (!config.isProduction) console.error("[api]", message);
    if (res.headersSent) return;
    res.status(isUploadError ? 400 : 500).json({
      error: isUploadError ? message : "Something went wrong on the server.",
    });
  });

  return app;
}
