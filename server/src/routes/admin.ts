import { Router } from "express";
import { requireAdmin, requireStaff } from "../auth.js";
import { execute, nowIso, queryAll, queryOne, transaction, uid } from "../db.js";
import { notifyStaff, notifyUser } from "../notifications.js";
import { audit, serializeComplaint, type ComplaintRow } from "../serialize.js";
import { STATUS_IDS, type StatusId } from "../types.js";
import { bad, parseNumber, queryString, text } from "../validate.js";

export const adminRouter = Router();

adminRouter.use(requireStaff);

function staffComplaint(id: string) {
  return queryOne<ComplaintRow>("SELECT * FROM complaints WHERE id = ?", [id]);
}

adminRouter.get("/complaints", (req, res) => {
  const status = queryString(req, "status");
  const category = queryString(req, "category");
  const priority = queryString(req, "priority");
  const city = queryString(req, "city");
  const ward = queryString(req, "ward");
  const search = queryString(req, "q").trim();
  const page = Math.max(1, Number(queryString(req, "page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(queryString(req, "pageSize") || 25)));

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (status && status !== "all") {
    where.push("status = ?");
    params.push(status);
  }
  if (category && category !== "all") {
    where.push("category = ?");
    params.push(category);
  }
  if (priority && priority !== "all") {
    where.push("priority = ?");
    params.push(priority);
  }
  if (city && city !== "all") {
    where.push("city = ?");
    params.push(city);
  }
  if (ward && ward !== "all") {
    where.push("ward = ?");
    params.push(ward);
  }
  if (search) {
    where.push("LOWER(id || ' ' || title || ' ' || address || ' ' || description) LIKE ?");
    params.push(`%${search.toLowerCase()}%`);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total =
    queryOne<{ count: number }>(`SELECT COUNT(*) AS count FROM complaints ${clause}`, params)?.count ?? 0;
  const rows = queryAll<ComplaintRow>(
    `SELECT * FROM complaints ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );
  res.json({
    items: rows.map((row) => serializeComplaint(row)),
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  });
});

adminRouter.get("/analytics", (_req, res) => {
  const totals = queryOne<Record<string, number>>(
    `SELECT COUNT(*) AS total,
       SUM(status = 'submitted') AS submitted,
       SUM(status = 'review') AS review,
       SUM(status = 'progress') AS progress,
       SUM(status = 'resolved') AS resolved,
       SUM(priority = 'critical') AS critical,
       SUM(priority = 'high') AS high
     FROM complaints`
  );

  const byStatus = queryAll<{ key: string; count: number }>(
    "SELECT status AS key, COUNT(*) AS count FROM complaints GROUP BY status"
  );
  const byCategory = queryAll<{ key: string; count: number }>(
    "SELECT category AS key, COUNT(*) AS count FROM complaints GROUP BY category ORDER BY count DESC"
  );
  const byPriority = queryAll<{ key: string; count: number }>(
    "SELECT priority AS key, COUNT(*) AS count FROM complaints GROUP BY priority"
  );
  const byWard = queryAll<{ key: string; count: number }>(
    "SELECT COALESCE(ward, 'Unassigned') AS key, COUNT(*) AS count FROM complaints GROUP BY key ORDER BY count DESC"
  );
  const byCity = queryAll<{ key: string; count: number }>(
    "SELECT city AS key, COUNT(*) AS count FROM complaints GROUP BY city ORDER BY count DESC"
  );
  const trend = queryAll<{ day: string; created: number; resolved: number }>(
    `SELECT d.day,
       (SELECT COUNT(*) FROM complaints c WHERE substr(c.created_at,1,10) = d.day) AS created,
       (SELECT COUNT(*) FROM complaints c WHERE c.status = 'resolved' AND substr(c.updated_at,1,10) = d.day) AS resolved
     FROM (SELECT DISTINCT substr(created_at,1,10) AS day FROM complaints
           UNION SELECT DISTINCT substr(updated_at,1,10) FROM complaints) d
     ORDER BY d.day ASC`
  ).slice(-30);

  const avg =
    queryOne<{ days: number | null }>(
      "SELECT AVG(julianday(updated_at) - julianday(created_at)) AS days FROM complaints WHERE status = 'resolved'"
    )?.days ?? null;
  const confirmations =
    queryOne<{ count: number }>("SELECT COUNT(*) AS count FROM confirmations")?.count ?? 0;
  const overdue =
    queryOne<{ count: number }>(
      "SELECT COUNT(*) AS count FROM complaints WHERE sla_due IS NOT NULL AND sla_due < ? AND status <> 'resolved'",
      [nowIso()]
    )?.count ?? 0;
  const workload = queryAll<{ key: string; count: number }>(
    `SELECT COALESCE(assigned_department, 'Unassigned') AS key, COUNT(*) AS count
     FROM complaints WHERE status <> 'resolved' GROUP BY key ORDER BY count DESC LIMIT 8`
  );
  const recent = queryAll<ComplaintRow>("SELECT * FROM complaints ORDER BY created_at DESC LIMIT 6").map((row) =>
    serializeComplaint(row)
  );
  const pendingVerification =
    queryOne<{ count: number }>(
      `SELECT COUNT(*) AS count FROM complaints c
       WHERE NOT EXISTS (SELECT 1 FROM verification_decisions v WHERE v.complaint_id = c.id)`
    )?.count ?? 0;

  const total = totals?.total ?? 0;
  res.json({
    generatedAt: nowIso(),
    totals: {
      total,
      submitted: totals?.submitted ?? 0,
      review: totals?.review ?? 0,
      progress: totals?.progress ?? 0,
      resolved: totals?.resolved ?? 0,
      critical: totals?.critical ?? 0,
      high: totals?.high ?? 0,
      pendingVerification,
      confirmations,
      overdue,
    },
    resolutionRate: total ? Math.round(((totals?.resolved ?? 0) / total) * 100) : 0,
    avgResolutionDays: avg === null ? null : Math.round(avg * 10) / 10,
    byStatus,
    byCategory,
    byPriority,
    byWard,
    byCity,
    trend,
    workload,
    recent,
  });
});

adminRouter.get("/verification", (req, res) => {
  const tab = queryString(req, "tab") || "pending";
  const latest = `(SELECT decision FROM verification_decisions v WHERE v.complaint_id = c.id ORDER BY created_at DESC LIMIT 1)`;
  const clause =
    tab === "pending"
      ? `WHERE ${latest} IS NULL`
      : `WHERE ${latest} = ?`;
  const rows = queryAll<ComplaintRow>(
    `SELECT c.* FROM complaints c ${clause} ORDER BY c.created_at DESC LIMIT 100`,
    tab === "pending" ? [] : [tab]
  );
  const counts = {
    pending:
      queryOne<{ count: number }>(
        `SELECT COUNT(*) AS count FROM complaints c WHERE ${latest} IS NULL`
      )?.count ?? 0,
    approved: queryOne<{ count: number }>(`SELECT COUNT(*) AS count FROM complaints c WHERE ${latest} = 'approved'`)?.count ?? 0,
    field_check:
      queryOne<{ count: number }>(`SELECT COUNT(*) AS count FROM complaints c WHERE ${latest} = 'field_check'`)?.count ?? 0,
    rejected: queryOne<{ count: number }>(`SELECT COUNT(*) AS count FROM complaints c WHERE ${latest} = 'rejected'`)?.count ?? 0,
  };
  const decisions = queryAll<Record<string, any>>(
    `SELECT v.*, u.name AS admin_name FROM verification_decisions v
     JOIN users u ON u.id = v.admin_id ORDER BY v.created_at DESC LIMIT 50`
  );
  res.json({
    tab,
    counts,
    items: rows.map((row) => serializeComplaint(row)),
    decisions: decisions.map((row) => ({
      id: row.id,
      complaintId: row.complaint_id,
      decision: row.decision,
      note: row.note,
      admin: row.admin_name,
      createdAt: row.created_at,
    })),
  });
});

adminRouter.post("/complaints/:id/verification", (req, res) => {
  const row = staffComplaint(String(req.params.id));
  if (!row) return bad(res, 404, "Complaint not found");
  const decision = text(req.body?.decision, 20);
  if (!["approved", "field_check", "rejected"].includes(decision))
    return bad(res, 400, "Decision must be approved, field_check or rejected.");
  const note = text(req.body?.note, 600);

  transaction(() => {
    execute(
      "INSERT INTO verification_decisions (id, complaint_id, admin_id, decision, note, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [uid(), row.id, req.user!.id, decision, note, nowIso()]
    );
    if (decision === "approved" && row.status === "submitted") {
      execute("UPDATE complaints SET status = 'review', updated_at = ? WHERE id = ?", [nowIso(), row.id]);
    }
    if (decision === "field_check") {
      execute(
        `UPDATE complaints SET status = CASE WHEN status = 'submitted' THEN 'review' ELSE status END,
         escalation_note = ?, updated_at = ? WHERE id = ?`,
        [note || "Field verification requested.", nowIso(), row.id]
      );
    }
    execute(
      "INSERT INTO notifications (id, user_id, complaint_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        uid(),
        row.reporter_id,
        row.id,
        "verification",
        `Verification update for ${row.id}`,
        decision === "approved"
          ? "Your report was verified by the municipal team."
          : decision === "field_check"
            ? "A field check has been scheduled for your report."
            : "Your report was reviewed and marked invalid.",
        nowIso(),
      ]
    );
  });
  audit(req.user!.id, "complaint.verification", "complaint", row.id, { decision });
  res.json({ complaint: serializeComplaint(staffComplaint(row.id)!, req.user!.id) });
});

adminRouter.patch("/complaints/:id", (req, res) => {
  const row = staffComplaint(String(req.params.id));
  if (!row) return bad(res, 404, "Complaint not found");

  const status = text(req.body?.status, 20);
  const resolutionNote = text(req.body?.resolutionNote, 1000);
  const department = text(req.body?.assignedDepartment, 120);
  const official = text(req.body?.assignedOfficial, 120);
  const escalateTo = text(req.body?.escalateTo, 160);
  const escalationSla = text(req.body?.escalationSla, 80);
  const escalationNote = text(req.body?.escalationNote, 600);
  const slaDays = parseNumber(req.body?.slaDays, 1, 90);
  const note = text(req.body?.note, 600);

  if (status && !STATUS_IDS.includes(status as StatusId))
    return bad(res, 400, "Invalid status.");
  if (status === "resolved" && resolutionNote.length < 5)
    return bad(res, 400, "Add resolution notes before closing a complaint.");

  const at = nowIso();
  transaction(() => {
    const updates: string[] = ["updated_at = ?"];
    const values: (string | number | null)[] = [at];

    if (status) {
      updates.push("status = ?");
      values.push(status);
      if (status === "resolved" && resolutionNote) {
        updates.push("resolution_note = ?");
        values.push(resolutionNote);
      }
      const targetIndex = STATUS_IDS.indexOf(status as StatusId);
      queryAll<{ id: string; seq: number }>(
        "SELECT id, seq FROM timeline WHERE complaint_id = ? ORDER BY seq",
        [row.id]
      ).forEach((event) => {
        execute(
          "UPDATE timeline SET done = ?, current = ?, at = CASE WHEN seq <= ? AND done = 0 THEN ? ELSE at END WHERE id = ?",
          [event.seq <= targetIndex ? 1 : 0, event.seq === targetIndex ? 1 : 0, targetIndex, at, event.id]
        );
      });
      if (status === "resolved" && resolutionNote) {
        execute(
          "UPDATE timeline SET note = ? WHERE complaint_id = ? AND status = 'resolved'",
          [resolutionNote, row.id]
        );
      }
    }

    if (department) {
      updates.push("assigned_department = ?", "assigned_at = ?");
      values.push(department, at);
    }
    if (official) {
      updates.push("assigned_official = ?");
      values.push(official);
    }
    if (slaDays !== null) {
      updates.push("sla_due = ?");
      values.push(new Date(Date.now() + slaDays * 86_400_000).toISOString());
    }
    if (escalateTo) {
      updates.push("escalated_to = ?", "escalation_sla = ?", "escalation_note = ?");
      values.push(escalateTo, escalationSla || "Urgent 24hr", escalationNote);
      if (row.status === "submitted") {
        updates.push("status = ?");
        values.push("review");
      }
    }
    execute(`UPDATE complaints SET ${updates.join(", ")} WHERE id = ?`, [...values, row.id]);

    if (note) {
      execute(
        "INSERT INTO comments (id, complaint_id, user_id, text, badge, created_at) VALUES (?, ?, ?, ?, 'Municipal team', ?)",
        [uid(), row.id, req.user!.id, note, at]
      );
    }

    const title = status
      ? `Complaint ${row.id} moved to ${status}`
      : escalateTo
        ? `Complaint ${row.id} escalated`
        : `Complaint ${row.id} updated`;
    execute(
      "INSERT INTO notifications (id, user_id, complaint_id, type, title, body, created_at) VALUES (?, ?, ?, 'status_update', ?, ?, ?)",
      [uid(), row.reporter_id, row.id, title, resolutionNote || note || "The municipal team updated your report.", at]
    );
  });

  audit(req.user!.id, "complaint.staff_update", "complaint", row.id, {
    status: status || undefined,
    department: department || undefined,
    escalated: Boolean(escalateTo),
  });
  if (status || escalateTo || department) {
    notifyStaff({
      complaintId: row.id,
      type: "status_change",
      title: `Updated ${row.id}`,
      body: [status && `status ${status}`, department && `assigned ${department}`, escalateTo && `escalated to ${escalateTo}`]
        .filter(Boolean)
        .join(" · "),
    });
  }
  res.json({ complaint: serializeComplaint(staffComplaint(row.id)!, req.user!.id) });
});

adminRouter.get("/official-requests", requireAdmin, (_req, res) => {
  const rows = queryAll<Record<string, any>>(
    "SELECT id, name, email, phone, department, designation, ward, organisation, official_status, created_at FROM users WHERE role = 'official' ORDER BY created_at DESC"
  );
  res.json({
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      department: row.department,
      designation: row.designation,
      ward: row.ward,
      organisation: row.organisation,
      status: row.official_status,
      createdAt: row.created_at,
    })),
  });
});

adminRouter.post("/official-requests/:id/decision", requireAdmin, (req, res) => {
  const decision = text(req.body?.decision, 20);
  if (!["approved", "rejected"].includes(decision)) return bad(res, 400, "Invalid decision.");
  const user = queryOne<{ id: string; role: string; name: string }>(
    "SELECT id, role, name FROM users WHERE id = ?",
    [String(req.params.id)]
  );
  if (!user || user.role !== "official") return bad(res, 404, "Official request not found");

  execute("UPDATE users SET official_status = ?, updated_at = ? WHERE id = ?", [
    decision,
    nowIso(),
    user.id,
  ]);
  notifyUser(user.id, {
    type: "official_decision",
    title: decision === "approved" ? "Staff access approved" : "Staff access request declined",
    body:
      decision === "approved"
        ? "You can now access the municipal operations console."
        : "An administrator declined this request. Contact your municipal IT desk for details.",
  });
  audit(req.user!.id, `official.${decision}`, "user", user.id);
  res.json({ ok: true, status: decision });
});

adminRouter.get("/audit", requireAdmin, (_req, res) => {
  const rows = queryAll<Record<string, any>>(
    `SELECT a.*, u.name AS actor FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
     ORDER BY a.created_at DESC LIMIT 100`
  );
  res.json({
    items: rows.map((row) => ({
      id: row.id,
      actor: row.actor ?? "system",
      action: row.action,
      entity: row.entity,
      entityId: row.entity_id,
      at: row.created_at,
    })),
  });
});
