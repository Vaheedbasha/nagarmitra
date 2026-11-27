import { Router } from "express";
import { requireAuth, rateLimit } from "../auth.js";
import { isAiConfigured } from "../config.js";
import { execute, nowIso, queryOne } from "../db.js";
import { listNotifications, unreadCount } from "../notifications.js";
import { AiUnavailableError, triageComplaint } from "../ai.js";
import { bad, text } from "../validate.js";

export const miscRouter = Router();

miscRouter.get("/health", (_req, res) => {
  let database = "ok";
  try {
    queryOne("SELECT 1 AS ok");
  } catch {
    database = "error";
  }
  res.status(database === "ok" ? 200 : 503).json({
    status: database === "ok" ? "ok" : "degraded",
    database,
    aiConfigured: isAiConfigured(),
    time: nowIso(),
  });
});

miscRouter.get("/ai/status", (_req, res) => {
  res.json({
    configured: isAiConfigured(),
    provider: isAiConfigured() ? "openai-compatible" : null,
    note: isAiConfigured()
      ? "AI requests are proxied server-side; keys never reach the browser."
      : "Set AI_API_KEY on the server to enable AI triage. Until then the app uses a transparent rule-based fallback.",
  });
});

miscRouter.post("/ai/triage", requireAuth, rateLimit("ai", 30, 10 * 60_000), async (req, res) => {
  const body = text(req.body?.text, 4000);
  if (body.length < 10) return bad(res, 400, "Describe the issue in at least 10 characters.");
  try {
    const result = await triageComplaint({
      text: body,
      language: text(req.body?.language, 2) || "en",
      city: text(req.body?.city, 80),
    });
    res.json({ configured: true, result });
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      res.status(error.reason === "not_configured" ? 503 : 502).json({
        configured: error.reason !== "not_configured",
        error: error.message,
      });
      return;
    }
    res.status(502).json({ configured: true, error: "AI request failed." });
  }
});

miscRouter.get("/notifications", requireAuth, (req, res) => {
  res.json({ items: listNotifications(req.user!.id), unread: unreadCount(req.user!.id) });
});

miscRouter.get("/notifications/unread-count", requireAuth, (req, res) => {
  res.json({ unread: unreadCount(req.user!.id) });
});

miscRouter.post("/notifications/:id/read", requireAuth, (req, res) => {
  execute("UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL", [
    nowIso(),
    String(req.params.id),
    req.user!.id,
  ]);
  res.json({ unread: unreadCount(req.user!.id) });
});

miscRouter.post("/notifications/read-all", requireAuth, (req, res) => {
  execute("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL", [
    nowIso(),
    req.user!.id,
  ]);
  res.json({ unread: 0 });
});
