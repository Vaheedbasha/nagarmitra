import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { requireAuth, optionalAuth } from "../auth.js";
import { config } from "../config.js";
import { execute, nextComplaintId, nowIso, queryAll, queryOne, transaction, uid } from "../db.js";
import { ALLOWED_MIME, extensionFor, sendMedia } from "../media.js";
import { notifyStaff, notifyUser } from "../notifications.js";
import { audit, serializeComplaint, type ComplaintRow } from "../serialize.js";
import { CATEGORY_IDS, canonicalCategory, type StatusId } from "../types.js";
import { bad, parseNumber, queryString, text } from "../validate.js";
import { explainScore, factorsForSeverity, priorityFromScore, scoreFromFactors } from "../priority.js";
import { isCloudConfigured, queueCloudSync, saveMediaToCloud, syncCloudDatabase, refreshIfNewer } from "../cloud-storage.js";

export const complaintRouter = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, done) => done(null, config.uploadDir),
    filename: (_req, file, done) => {
      const ext = extensionFor(file.mimetype) || path.extname(file.originalname).slice(0, 8);
      done(null, `${uid()}${ext}`);
    },
  }),
  limits: { fileSize: config.media.maxVideoBytes, files: 1 },
  fileFilter: (_req, file, done) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      done(new Error("Supported formats: Images (JPEG, PNG, WebP), Videos (MP4, WebM, MOV), Audio (MP3, WAV, WebM, OGG, M4A, AAC)."));
      return;
    }
    done(null, true);
  },
});

function canSeeComplaint(id: string) {
  return queryOne("SELECT id FROM complaints WHERE id = ?", [id]);
}

/** Lists complaints with filters. Reporter identity is never included. */
complaintRouter.get("/", optionalAuth, async (req, res) => {
  if (isCloudConfigured()) {
    try {
      await refreshIfNewer();
    } catch (e) {
      console.warn("[complaints] cloud refresh error:", e);
    }
  }
  const city = queryString(req, "city");
  const category = queryString(req, "category");
  const status = queryString(req, "status");
  const priority = queryString(req, "priority");
  const search = queryString(req, "q").trim();
  const mine = queryString(req, "mine") === "true";
  const page = Math.max(1, Number(queryString(req, "page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(queryString(req, "pageSize") || 50)));

  if (mine && !req.user) return bad(res, 401, "Authentication required");

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (city && city !== "all") {
    where.push("city = ?");
    params.push(city);
  }
  if (category && category !== "all") {
    where.push("category = ?");
    params.push(canonicalCategory(category));
  }
  if (status && status !== "all") {
    where.push("status = ?");
    params.push(status);
  }
  if (priority && priority !== "all") {
    where.push("priority = ?");
    params.push(priority);
  }
  if (search) {
    where.push("LOWER(title || ' ' || description || ' ' || address) LIKE ?");
    params.push(`%${search.toLowerCase()}%`);
  }
  if (mine) {
    where.push("reporter_id = ?");
    params.push(req.user!.id);
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total =
    queryOne<{ count: number }>(`SELECT COUNT(*) AS count FROM complaints ${clause}`, params)?.count ?? 0;

  const rows = queryAll<ComplaintRow>(
    `SELECT * FROM complaints ${clause}
     ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
              created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  res.json({
    items: rows.map((row) => serializeComplaint(row, req.user?.id)),
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  });
});

complaintRouter.get("/stats", (req, res) => {
  const city = queryString(req, "city");
  const filter = city && city !== "all" ? "WHERE city = ?" : "";
  const params = city && city !== "all" ? [city] : [];
  const totals = queryOne<Record<string, number>>(
    `SELECT COUNT(*) AS total,
      SUM(status = 'resolved') AS resolved,
      SUM(status = 'progress') AS progress,
      SUM(priority IN ('high','critical')) AS highPriority,
      SUM(status = 'submitted') AS submitted
     FROM complaints ${filter}`,
    params
  );
  const confirmations =
    queryOne<{ count: number }>(
      `SELECT COUNT(*) AS count FROM confirmations c
       JOIN complaints x ON x.id = c.complaint_id ${city && city !== "all" ? "WHERE x.city = ?" : ""}`,
      params
    )?.count ?? 0;
  res.json({
    total: totals?.total ?? 0,
    resolved: totals?.resolved ?? 0,
    inProgress: totals?.progress ?? 0,
    highPriority: totals?.highPriority ?? 0,
    submitted: totals?.submitted ?? 0,
    confirmations,
  });
});

complaintRouter.get("/:id", optionalAuth, async (req, res) => {
  let row = queryOne<ComplaintRow>("SELECT * FROM complaints WHERE id = ?", [String(req.params.id)]);
  if (!row && isCloudConfigured()) {
    try {
      await refreshIfNewer();
      row = queryOne<ComplaintRow>("SELECT * FROM complaints WHERE id = ?", [String(req.params.id)]);
    } catch (e) {
      console.warn("[complaints] single get refresh error:", e);
    }
  }
  if (!row) return bad(res, 404, "Complaint not found");
  res.json({ complaint: serializeComplaint(row, req.user?.id) });
});

complaintRouter.post("/", requireAuth, async (req, res) => {
  const body = req.body ?? {};
  const title = text(body.title, 120);
  const description = text(body.description, 4000);
  const rawCategory = text(body.category, 40);
  const severity = text(body.severity, 20) || "medium";
  const address = text(body.location, 240);
  const area = text(body.area, 120) || address.split(",")[0]?.trim() || "Unknown";
  const ward = text(body.ward, 60) || null;
  const city = text(body.city, 80) || "Hyderabad";
  const lat = parseNumber(body.lat, -90, 90);
  const lng = parseNumber(body.lng, -180, 180);
  const mediaIds: string[] = Array.isArray(body.mediaIds) ? body.mediaIds.slice(0, 4).map(String) : [];
  const aiSource = text(body.aiSource, 30) || "rule-based";
  const aiText =
    text(body.aiSummary, 600) || `${title.trim()} reported at ${address.trim()} (${city}).`;

  if (title.length < 8) return bad(res, 400, "Add a title of at least 8 characters.");
  if (description.length < 25) return bad(res, 400, "Describe the issue in at least 25 characters.");
  if (!CATEGORY_IDS.includes(canonicalCategory(rawCategory)))
    return bad(res, 400, "Choose a valid category.");
  if (!address || address.length < 4) return bad(res, 400, "Add the area or street.");
  if (lat === null || lng === null) return bad(res, 400, "Choose the issue location on the map.");

  // Duplicate guard: same reporter + very similar title in the last 10 minutes.
  const duplicate = queryOne<{ id: string }>(
    `SELECT id FROM complaints WHERE reporter_id = ? AND LOWER(title) = ? AND created_at > ?`,
    [req.user!.id, title.toLowerCase(), new Date(Date.now() - 10 * 60_000).toISOString()]
  );
  if (duplicate) return bad(res, 409, "A very similar complaint was just submitted.", { duplicateId: duplicate.id });

  const factors = factorsForSeverity(severity, canonicalCategory(rawCategory));
  const score = scoreFromFactors(factors);
  const priority = priorityFromScore(score);
  const id = nextComplaintId();
  const at = nowIso();

  // Only media the caller uploaded and that is not already linked may be attached.
  const ownedMedia = mediaIds
    .map((mediaId) =>
      queryOne<{ id: string; kind: string }>(
        "SELECT id, kind FROM media WHERE id = ? AND uploaded_by = ? AND complaint_id IS NULL",
        [mediaId, req.user!.id]
      )
    )
    .filter(Boolean) as { id: string; kind: string }[];

  transaction(() => {
    execute(
      `INSERT INTO complaints
       (id, title, description, ai_summary, ai_source, category, status, priority, score, factors_json,
        lat, lng, address, area, ward, city, reporter_id, is_demo, photo, why_json, created_at, updated_at, base_upvotes)
       VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, 0)`,
      [
        id,
        title,
        description,
        aiText,
        aiSource,
        canonicalCategory(rawCategory),
        priority,
        score,
        JSON.stringify(factors),
        lat,
        lng,
        address,
        area,
        ward,
        city,
        req.user!.id,
        JSON.stringify(explainScore(factors, score, priority)),
        at,
        at,
      ]
    );

    const steps: { status: StatusId; label: string; note: string }[] = [
      { status: "submitted", label: "Report received", note: "Complaint logged and acknowledgement sent to the reporter." },
      { status: "review", label: "Under review", note: "Ward officer validating details and assigning a field team." },
      { status: "progress", label: "Work in progress", note: "Field crew dispatched. Repair work is underway." },
      { status: "resolved", label: "Resolved", note: "Work verified on site and the complaint has been closed." },
    ];
    steps.forEach((step, index) => {
      execute(
        `INSERT INTO timeline (id, complaint_id, status, label, note, done, current, seq, at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uid(), id, step.status, step.label, step.note, index === 0 ? 1 : 0, index === 0 ? 1 : 0, index, at]
      );
    });

    for (const media of ownedMedia) {
      execute("UPDATE media SET complaint_id = ? WHERE id = ?", [id, media.id]);
      execute(`UPDATE complaints SET ${media.kind === "photo" ? "photo" : "video"} = ? WHERE id = ?`, [
        `/api/media/${media.id}`,
        id,
      ]);
    }

    execute(
      `UPDATE users SET trust_score = MIN(100, trust_score + 2), updated_at = ? WHERE id = ?`,
      [at, req.user!.id]
    );
  });

  const created = queryOne<ComplaintRow>("SELECT * FROM complaints WHERE id = ?", [id])!;
  notifyStaff({
    complaintId: id,
    type: priority === "critical" ? "critical_complaint" : "new_complaint",
    title: `${priority === "critical" ? "Critical" : "New"} complaint ${id}`,
    body: `${title} · ${address} · ${priority} priority (${score}/100)`,
  });
  notifyUser(req.user!.id, {
    complaintId: id,
    type: "complaint_created",
    title: `Complaint ${id} received`,
    body: "You can track its status in My Reports.",
  });
  audit(req.user!.id, "complaint.create", "complaint", id, { priority, score });

  if (isCloudConfigured()) {
    try {
      await syncCloudDatabase();
    } catch (e) {
      console.warn("[complaints] cloud sync error:", e);
    }
  }

  res.status(201).json({ complaint: serializeComplaint(created, req.user!.id) });
});

/** Owner edits are allowed while the complaint is still open. */
complaintRouter.patch("/:id", requireAuth, async (req, res) => {
  const row = queryOne<ComplaintRow>("SELECT * FROM complaints WHERE id = ?", [String(req.params.id)]);
  if (!row) return bad(res, 404, "Complaint not found");
  if (row.reporter_id !== req.user!.id && req.user!.role !== "admin")
    return bad(res, 403, "You can only edit your own complaint.");
  if (row.status === "resolved") return bad(res, 409, "Resolved complaints cannot be edited.");

  const title = text(req.body?.title, 120) || row.title;
  const description = text(req.body?.description, 4000) || row.description;
  if (title.length < 8 || description.length < 25)
    return bad(res, 400, "Title or description is too short.");

  execute("UPDATE complaints SET title = ?, description = ?, updated_at = ? WHERE id = ?", [
    title,
    description,
    nowIso(),
    row.id,
  ]);
  audit(req.user!.id, "complaint.update", "complaint", row.id);
  if (isCloudConfigured()) {
    try {
      await syncCloudDatabase();
    } catch (e) {
      console.warn("[complaints] cloud sync error:", e);
    }
  } else {
    queueCloudSync();
  }
  res.json({ complaint: serializeComplaint(queryOne<ComplaintRow>("SELECT * FROM complaints WHERE id = ?", [row.id])!, req.user!.id) });
});

/** Delete complaint by citizen (own report) or admin/official. */
complaintRouter.delete("/:id", requireAuth, async (req, res) => {
  const row = queryOne<ComplaintRow>("SELECT * FROM complaints WHERE id = ?", [String(req.params.id)]);
  if (!row) return bad(res, 404, "Complaint not found");

  const isReporter = row.reporter_id === req.user!.id;
  const isStaff = req.user!.role === "admin" || req.user!.role === "official";
  if (!isReporter && !isStaff) {
    return bad(res, 403, "You can only delete your own submitted reports.");
  }

  transaction(() => {
    execute("DELETE FROM timeline WHERE complaint_id = ?", [row.id]);
    execute("DELETE FROM comments WHERE complaint_id = ?", [row.id]);
    execute("DELETE FROM confirmations WHERE complaint_id = ?", [row.id]);
    execute("DELETE FROM media WHERE complaint_id = ?", [row.id]);
    execute("DELETE FROM complaints WHERE id = ?", [row.id]);
  });

  audit(req.user!.id, "complaint.delete", "complaint", row.id);
  if (isCloudConfigured()) {
    try {
      await syncCloudDatabase();
    } catch (e) {
      console.warn("[complaints] cloud sync error:", e);
    }
  } else {
    queueCloudSync();
  }
  res.json({ ok: true, deletedId: row.id });
});

/** Idempotent community confirmation. */
complaintRouter.post("/:id/confirm", requireAuth, async (req, res) => {
  const row = queryOne<ComplaintRow>("SELECT * FROM complaints WHERE id = ?", [String(req.params.id)]);
  if (!row) return bad(res, 404, "Complaint not found");
  if (row.reporter_id === req.user!.id) return bad(res, 409, "You cannot confirm your own report.");

  const existing = queryOne("SELECT 1 FROM confirmations WHERE complaint_id = ? AND user_id = ?", [
    row.id,
    req.user!.id,
  ]);
  if (existing) {
    execute("DELETE FROM confirmations WHERE complaint_id = ? AND user_id = ?", [row.id, req.user!.id]);
  } else {
    execute("INSERT INTO confirmations (complaint_id, user_id, created_at) VALUES (?, ?, ?)", [
      row.id,
      req.user!.id,
      nowIso(),
    ]);
  }
  audit(req.user!.id, existing ? "complaint.unconfirm" : "complaint.confirm", "complaint", row.id);
  if (isCloudConfigured()) {
    try {
      await syncCloudDatabase();
    } catch (e) {
      console.warn("[complaints] cloud sync error:", e);
    }
  }
  res.json({ complaint: serializeComplaint(row, req.user!.id) });
});

complaintRouter.post("/:id/comments", requireAuth, async (req, res) => {
  const row = queryOne<ComplaintRow>("SELECT * FROM complaints WHERE id = ?", [String(req.params.id)]);
  if (!row) return bad(res, 404, "Complaint not found");
  const body = text(req.body?.text, 800);
  if (body.length < 2) return bad(res, 400, "Write a short comment.");

  execute("INSERT INTO comments (id, complaint_id, user_id, text, badge, created_at) VALUES (?, ?, ?, ?, ?, ?)", [
    uid(),
    row.id,
    req.user!.id,
    body,
    req.user!.role === "citizen" ? "Citizen" : "Municipal team",
    nowIso(),
  ]);
  audit(req.user!.id, "complaint.comment", "complaint", row.id);
  if (isCloudConfigured()) {
    try {
      await syncCloudDatabase();
    } catch (e) {
      console.warn("[complaints] cloud sync error:", e);
    }
  }
  res.status(201).json({ complaint: serializeComplaint(row, req.user!.id) });
});

/** Standalone upload; media is linked to a complaint at submission time. */
complaintRouter.post("/media", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) return bad(res, 400, "No file received.");
  const isAudio = req.file.mimetype.startsWith("audio/");
  const isVideo = req.file.mimetype.startsWith("video/");
  const kind = isVideo ? "video" : (isAudio ? "audio" : "photo");
  const limit = kind === "photo" ? config.media.maxImageBytes : config.media.maxVideoBytes;
  if (req.file.size > limit) {
    return bad(res, 413, `File is too large. Maximum ${Math.round(limit / 1024 / 1024)} MB.`);
  }
  const id = uid();
  execute(
    `INSERT INTO media (id, complaint_id, kind, filename, mime, size, original_name, uploaded_by, created_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
    [id, kind, req.file.filename, req.file.mimetype, req.file.size, req.file.originalname.slice(0, 200), req.user!.id, nowIso()]
  );
  if (isCloudConfigured() && req.file.path) {
    try {
      const buffer = fs.readFileSync(req.file.path);
      await saveMediaToCloud(id, req.file.mimetype, buffer);
      await syncCloudDatabase();
    } catch (e) {
      console.warn("[media] Cloud media save warning:", e);
    }
  }
  res.status(201).json({ id, kind, url: `/api/media/${id}`, size: req.file.size });
});

complaintRouter.get("/media/:id", optionalAuth, (req, res) => {
  const media = queryOne<{ complaint_id: string | null; uploaded_by: string }>(
    "SELECT complaint_id, uploaded_by FROM media WHERE id = ?",
    [String(req.params.id)]
  );
  if (!media) return bad(res, 404, "Media not found");
  if (!media.complaint_id && media.uploaded_by !== req.user?.id) return bad(res, 403, "Not allowed");
  void sendMedia(String(req.params.id), res);
});

complaintRouter.post("/:id/media", requireAuth, upload.single("file"), async (req, res) => {
  const row = queryOne<ComplaintRow>("SELECT * FROM complaints WHERE id = ?", [String(req.params.id)]);
  if (!row) return bad(res, 404, "Complaint not found");
  if (row.reporter_id !== req.user!.id && req.user!.role !== "admin")
    return bad(res, 403, "Not allowed");
  if (!req.file) return bad(res, 400, "No file received");
  const isAudio = req.file.mimetype.startsWith("audio/");
  const isVideo = req.file.mimetype.startsWith("video/");
  const kind = isVideo ? "video" : (isAudio ? "audio" : "photo");
  const id = uid();
  execute(
    `INSERT INTO media (id, complaint_id, kind, filename, mime, size, original_name, uploaded_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, row.id, kind, req.file.filename, req.file.mimetype, req.file.size, req.file.originalname.slice(0, 200), req.user!.id, nowIso()]
  );
  if (isCloudConfigured() && req.file.path) {
    try {
      const buffer = fs.readFileSync(req.file.path);
      await saveMediaToCloud(id, req.file.mimetype, buffer);
    } catch (e) {
      console.warn("[media] Cloud media save warning:", e);
    }
  }
  execute(`UPDATE complaints SET ${kind === "photo" ? "photo" : "video"} = ?, updated_at = ? WHERE id = ?`, [
    `/api/media/${id}`,
    nowIso(),
    row.id,
  ]);
  audit(req.user!.id, "complaint.media", "complaint", row.id, { kind });
  if (isCloudConfigured()) {
    try {
      await syncCloudDatabase();
    } catch (e) {
      console.warn("[media] cloud sync error:", e);
    }
  }
  res.status(201).json({
    media: { id, kind, url: `/api/media/${id}` },
    complaint: serializeComplaint(queryOne<ComplaintRow>("SELECT * FROM complaints WHERE id = ?", [row.id])!, req.user!.id),
  });
});

