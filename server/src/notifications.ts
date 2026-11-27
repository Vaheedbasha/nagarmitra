import { execute, nowIso, queryAll, queryOne, uid } from "./db.js";

interface NotifyInput {
  complaintId?: string;
  type: string;
  title: string;
  body?: string;
}

/** Inserts one notification per active staff account (admins and approved officials). */
export function notifyStaff(input: NotifyInput) {
  const staff = queryAll<{ id: string }>(
    "SELECT id FROM users WHERE status = 'active' AND (role = 'admin' OR (role = 'official' AND official_status = 'approved'))"
  );
  const at = nowIso();
  for (const member of staff) {
    execute(
      "INSERT INTO notifications (id, user_id, complaint_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [uid(), member.id, input.complaintId ?? null, input.type, input.title, input.body ?? "", at]
    );
  }
}

export function notifyUser(userId: string, input: NotifyInput) {
  execute(
    "INSERT INTO notifications (id, user_id, complaint_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [uid(), userId, input.complaintId ?? null, input.type, input.title, input.body ?? "", nowIso()]
  );
}

export function listNotifications(userId: string, limit = 50) {
  return queryAll<{
    id: string;
    complaint_id: string | null;
    type: string;
    title: string;
    body: string;
    read_at: string | null;
    created_at: string;
  }>(
    "SELECT id, complaint_id, type, title, body, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    [userId, limit]
  ).map((row) => ({
    id: row.id,
    complaintId: row.complaint_id,
    type: row.type,
    title: row.title,
    body: row.body,
    read: Boolean(row.read_at),
    createdAt: row.created_at,
  }));
}

export function unreadCount(userId: string) {
  return (
    queryOne<{ count: number }>(
      "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL",
      [userId]
    )?.count ?? 0
  );
}
