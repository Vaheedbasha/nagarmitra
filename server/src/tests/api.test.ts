import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

// Use an isolated database so tests never touch development data.
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nagarmitra-test-"));
process.env.DATABASE_PATH = path.join(tempDir, "test.db");
process.env.UPLOAD_DIR = path.join(tempDir, "uploads");
process.env.NODE_ENV = "test";
process.env.ADMIN_PASSWORD = "Admin@12345";
delete process.env.AI_API_KEY;

const { createApp } = await import("../app.js");
const { seedDatabase } = await import("../seed.js");
const { db } = await import("../db.js");

seedDatabase();
const app = createApp();
let server: import("node:http").Server;
let base = "";

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  base = `http://127.0.0.1:${port}`;
});

after(() => {
  server?.close();
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

async function call(pathname: string, options: { method?: string; token?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = {};
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.body) headers["content-type"] = "application/json";
  const response = await fetch(`${base}${pathname}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return { status: response.status, json: (await response.json()) as any };
}

let adminToken = "";
let citizenToken = "";
let complaintId = "";

test("health reports a working database and unconfigured AI", async () => {
  const response = await call("/api/health");
  assert.equal(response.status, 200);
  assert.equal(response.json.database, "ok");
  assert.equal(response.json.aiConfigured, false);
});

test("administrator can sign in", async () => {
  const response = await call("/api/auth/login", {
    method: "POST",
    body: { identifier: "admin@nagarmitra.local", password: "Admin@12345" },
  });
  assert.equal(response.status, 200);
  assert.equal(response.json.user.role, "admin");
  adminToken = response.json.token;
  assert.ok(adminToken);
});

test("wrong password is rejected", async () => {
  const response = await call("/api/auth/login", {
    method: "POST",
    body: { identifier: "admin@nagarmitra.local", password: "not-the-password" },
  });
  assert.equal(response.status, 401);
});

test("seeded complaints are available with real coordinates", async () => {
  const response = await call("/api/complaints");
  assert.equal(response.status, 200);
  assert.ok(response.json.items.length >= 15);
  const first = response.json.items[0];
  assert.equal(typeof first.lat, "number");
  assert.equal(typeof first.lng, "number");
});

test("complaint responses never expose reporter identity", async () => {
  const response = await call("/api/complaints");
  const payload = JSON.stringify(response.json);
  for (const forbidden of ["Ananya", "Rahul", "9000000001", "@nagarmitra.local"]) {
    assert.equal(payload.includes(forbidden), false, `leaked ${forbidden}`);
  }
  assert.equal(response.json.items[0].reporter.name, undefined);
});

test("citizen registration creates a citizen session", async () => {
  const response = await call("/api/auth/register", {
    method: "POST",
    body: {
      name: "Test Citizen",
      email: `citizen-${Date.now()}@example.com`,
      phone: `7${Date.now().toString().slice(-9)}`,
      password: "Testing12345",
      city: "Hyderabad",
    },
  });
  assert.equal(response.status, 201);
  assert.equal(response.json.user.role, "citizen");
  citizenToken = response.json.token;
});

test("citizens cannot reach staff endpoints", async () => {
  const response = await call("/api/admin/analytics", { token: citizenToken });
  assert.equal(response.status, 403);
});

test("anonymous users cannot create complaints", async () => {
  const response = await call("/api/complaints", {
    method: "POST",
    body: { title: "Anonymous attempt", description: "x".repeat(40) },
  });
  assert.equal(response.status, 401);
});

test("complaint creation validates input", async () => {
  const response = await call("/api/complaints", {
    method: "POST",
    token: citizenToken,
    body: { title: "short", description: "too short", category: "roads" },
  });
  assert.equal(response.status, 400);
});

test("complaint creation persists and returns an identifier", async () => {
  const response = await call("/api/complaints", {
    method: "POST",
    token: citizenToken,
    body: {
      title: "Overflowing drain beside the test school",
      description: "Sewage has overflowed onto the footpath for three days near the school gate.",
      category: "drainage",
      severity: "high",
      location: "School Road, Ward 4",
      city: "Hyderabad",
      lat: 17.4021,
      lng: 78.4702,
    },
  });
  assert.equal(response.status, 201);
  assert.match(response.json.complaint.id, /^CF-\d{4}-\d{4}$/);
  complaintId = response.json.complaint.id;
});

test("my reports contains only the caller's complaint", async () => {
  const response = await call("/api/complaints?mine=true", { token: citizenToken });
  assert.equal(response.status, 200);
  assert.equal(response.json.items.length, 1);
  assert.equal(response.json.items[0].id, complaintId);
});

test("citizens cannot confirm their own report", async () => {
  const response = await call(`/api/complaints/${complaintId}/confirm`, {
    method: "POST",
    token: citizenToken,
  });
  assert.equal(response.status, 409);
});

test("staff can update status and the change persists", async () => {
  const update = await call(`/api/admin/complaints/${complaintId}`, {
    method: "PATCH",
    token: adminToken,
    body: { status: "progress", note: "Crew dispatched for desilting." },
  });
  assert.equal(update.status, 200);
  assert.equal(update.json.complaint.status, "progress");

  const refetched = await call(`/api/complaints/${complaintId}`);
  assert.equal(refetched.json.complaint.status, "progress");
  assert.equal(JSON.stringify(refetched.json).includes("Test Citizen"), false);
});

test("verification decisions are stored and counted", async () => {
  const decision = await call(`/api/admin/complaints/${complaintId}/verification`, {
    method: "POST",
    token: adminToken,
    body: { decision: "field_check", note: "Send a field officer." },
  });
  assert.equal(decision.status, 200);

  const queue = await call("/api/admin/verification?tab=field_check", { token: adminToken });
  assert.equal(queue.status, 200);
  assert.ok(queue.json.items.some((item: any) => item.id === complaintId));
  assert.ok(queue.json.decisions.some((entry: any) => entry.complaintId === complaintId));
});

test("notifications are created for staff and can be marked read", async () => {
  const list = await call("/api/notifications", { token: adminToken });
  assert.equal(list.status, 200);
  assert.ok(list.json.items.length > 0);
  assert.ok(list.json.unread > 0);

  const first = list.json.items[0];
  const read = await call(`/api/notifications/${first.id}/read`, { method: "POST", token: adminToken });
  assert.equal(read.status, 200);

  const all = await call("/api/notifications/read-all", { method: "POST", token: adminToken });
  assert.equal(all.json.unread, 0);
});

test("official registration starts pending and gains no staff access", async () => {
  const email = `official-${Date.now()}@example.org`;
  const response = await call("/api/auth/register-official", {
    method: "POST",
    body: {
      name: "Pending Official",
      email,
      phone: `8${Date.now().toString().slice(-9)}`,
      password: "Testing12345",
      department: "Water Supply",
      designation: "Assistant Engineer",
      ward: "Ward 2",
      organisation: "RMC",
    },
  });
  assert.equal(response.status, 201);
  assert.equal(response.json.status, "pending");

  const login = await call("/api/auth/login", {
    method: "POST",
    body: { identifier: email, password: "Testing12345" },
  });
  assert.equal(login.status, 200);
  assert.equal(login.json.pendingApproval, true);

  const blocked = await call("/api/admin/complaints", { token: login.json.token });
  assert.equal(blocked.status, 403);
});

test("AI triage reports not-configured instead of returning fake output", async () => {
  const response = await call("/api/ai/triage", {
    method: "POST",
    token: citizenToken,
    body: { text: "The streetlight outside my house has been broken for a week." },
  });
  assert.equal(response.status, 503);
  assert.equal(response.json.configured, false);
});

test("analytics are computed from database records", async () => {
  const response = await call("/api/admin/analytics", { token: adminToken });
  assert.equal(response.status, 200);
  assert.ok(response.json.totals.total >= 15);
  assert.ok(Array.isArray(response.json.byCategory));
  assert.ok(response.json.byCategory.every((entry: any) => typeof entry.count === "number"));
});

test("unknown API routes return JSON 404", async () => {
  const response = await call("/api/does-not-exist");
  assert.equal(response.status, 404);
  assert.equal(typeof response.json.error, "string");
});
