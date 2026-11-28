import { randomUUID } from "node:crypto";
import { db, queryOne, queryAll } from "./db.js";

/**
 * Privacy boundary. Reporter name, email, phone and user id are never serialised
 * into a complaint response, for citizens and staff alike. Only aggregate signals
 * (report count, trust score) leave the server.
 */
export interface ComplaintRow {
  id: string;
  title: string;
  description: string;
  ai_summary: string;
  ai_source: string;
  category: string;
  status: string;
  priority: string;
  score: number;
  factors_json: string;
  lat: number;
  lng: number;
  address: string;
  area: string;
  ward: string | null;
  city: string;
  reporter_id: string;
  is_demo: number;
  base_upvotes: number;
  photo: string | null;
  video: string | null;
  why_json: string;
  resolution_note: string | null;
  escalated_to: string | null;
  escalation_sla: string | null;
  escalation_note: string | null;
  assigned_department: string | null;
  assigned_official: string | null;
  assigned_at: string | null;
  sla_due: string | null;
  created_at: string;
  updated_at: string;
}

export function serializeComplaint(row: ComplaintRow, viewerId?: string) {
  const reporter = queryOne<{ reports: number; trust: number }>(
    `SELECT COUNT(*) AS reports, COALESCE((SELECT trust_score FROM users WHERE id = ?), 70) AS trust
     FROM complaints WHERE reporter_id = ?`,
    [row.reporter_id, row.reporter_id]
  );

  const timeline = queryAll<{
    status: string;
    label: string;
    note: string;
    done: number;
    current: number;
    at: string;
  }>("SELECT status, label, note, done, current, at FROM timeline WHERE complaint_id = ? ORDER BY seq", [
    row.id,
  ]);

  const comments = queryAll<{
    id: string;
    text: string;
    badge: string;
    created_at: string;
    author: string;
    role: string;
  }>(
    `SELECT c.id, c.text, c.badge, c.created_at, u.name AS author, u.role
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.complaint_id = ? ORDER BY c.created_at ASC`,
    [row.id]
  ).map((comment) => ({
    id: comment.id,
    // Staff comments are attributed to the department, not the individual's personal profile.
    author: comment.role === "citizen" ? "Citizen" : "Municipal team",
    date: comment.created_at.slice(0, 10),
    text: comment.text,
    badge: comment.badge,
  }));

  const confirmations = queryOne<{ count: number }>(
    "SELECT COUNT(*) AS count FROM confirmations WHERE complaint_id = ?",
    [row.id]
  );
  const mine = viewerId
    ? queryOne<{ one: number }>("SELECT 1 AS one FROM confirmations WHERE complaint_id = ? AND user_id = ?", [
        row.id,
        viewerId,
      ])
    : undefined;

  const media = queryAll<{ kind: string; mime: string; id: string }>(
    "SELECT id, kind, mime FROM media WHERE complaint_id = ? ORDER BY created_at",
    [row.id]
  );
  const photoMedia = media.find((item) => item.kind === "photo");
  const videoMedia = media.find((item) => item.kind === "video");
  const audioMedia = media.find((item) => item.kind === "audio" || item.mime?.startsWith("audio/"));

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    aiSummary: row.ai_summary,
    aiSource: row.ai_source,
    category: row.category,
    status: row.status,
    priority: row.priority,
    score: row.score,
    factors: JSON.parse(row.factors_json),
    city: row.city,
    location: row.address,
    area: row.area,
    ward: row.ward ?? undefined,
    date: row.created_at.slice(0, 10),
    updated: row.updated_at.slice(0, 10),
    photo: row.photo ?? (photoMedia ? `/api/media/${photoMedia.id}` : undefined),
    video: row.video ?? (videoMedia ? `/api/media/${videoMedia.id}` : undefined),
    audio: audioMedia ? `/api/media/${audioMedia.id}` : undefined,
    media: media.map((item) => ({ id: item.id, kind: item.kind, url: `/api/media/${item.id}` })),
    lat: row.lat,
    lng: row.lng,
    upvotes: (row.base_upvotes ?? 0) + (confirmations?.count ?? 0),
    confirmedByMe: Boolean(mine),
    reporter: {
      anonymous: true,
      reports: reporter?.reports ?? 0,
      trust: reporter?.trust ?? 70,
    },
    why: JSON.parse(row.why_json || "[]"),
    timeline: timeline.map((event) => ({
      status: event.status,
      label: event.label,
      date: event.at.slice(0, 10),
      note: event.note,
      done: Boolean(event.done),
      current: Boolean(event.current),
    })),
    resolutionNote: row.resolution_note ?? undefined,
    comments,
    escalatedTo: row.escalated_to ?? undefined,
    escalationSla: row.escalation_sla ?? undefined,
    escalationNote: row.escalation_note ?? undefined,
    assignedDepartment: row.assigned_department ?? undefined,
    assignedOfficial: row.assigned_official ?? undefined,
    assignedAt: row.assigned_at ?? undefined,
    slaDue: row.sla_due ?? undefined,
    isDemo: Boolean(row.is_demo),
    isMine: viewerId ? row.reporter_id === viewerId : false,
  };
}

export function audit(actorId: string | null, action: string, entity: string, entityId: string, meta: unknown = {}) {
  db.prepare(
    "INSERT INTO audit_log (id, actor_id, action, entity, entity_id, meta_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    randomUUID(),
    actorId,
    action,
    entity,
    entityId,
    JSON.stringify(meta),
    new Date().toISOString()
  );
}
