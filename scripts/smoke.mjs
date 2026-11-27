const base = process.env.API_URL ?? "http://127.0.0.1:8787";
let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL ${name} ${detail}`);
  }
}

async function call(path, { method = "GET", token, body, form } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body) headers["content-type"] = "application/json";
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: response.status, json };
}

const health = await call("/api/health");
check("health endpoint", health.status === 200 && health.json.database === "ok", JSON.stringify(health.json));

const adminLogin = await call("/api/auth/login", {
  method: "POST",
  body: { identifier: "admin@nagarmitra.local", password: "Admin@12345" },
});
check("admin login", adminLogin.status === 200 && adminLogin.json.user.role === "admin", JSON.stringify(adminLogin.json).slice(0, 200));
const adminToken = adminLogin.json.token;

const list = await call("/api/complaints");
check("seeded complaints returned", list.json.items?.length >= 15, `got ${list.json.items?.length}`);
check("coordinates are real", typeof list.json.items?.[0]?.lat === "number" && Math.abs(list.json.items[0].lat) < 90);
const leaked = JSON.stringify(list.json).match(/Ananya|Rahul|9000000001|@nagarmitra\.local/);
check("public list hides reporter PII", !leaked, leaked?.[0] ?? "");

const email = `smoke${Date.now()}@example.com`;
const register = await call("/api/auth/register", {
  method: "POST",
  body: {
    name: "Smoke Tester",
    email,
    phone: `9${Date.now().toString().slice(-9)}`,
    password: "Testing12345",
    city: "Riverton",
  },
});
check("citizen registration", register.status === 201 && register.json.user.role === "citizen", JSON.stringify(register.json).slice(0, 200));
const citizenToken = register.json.token;

const duplicate = await call("/api/auth/register", {
  method: "POST",
  body: { name: "Dup", email, phone: "9111111111", password: "Testing12345" },
});
check("duplicate email rejected", duplicate.status === 409);

const forbidden = await call("/api/admin/analytics", { token: citizenToken });
check("citizen blocked from admin API", forbidden.status === 403, `got ${forbidden.status}`);

const created = await call("/api/complaints", {
  method: "POST",
  token: citizenToken,
  body: {
    title: "Overflowing drain beside the smoke test school",
    description: "Sewage water has been overflowing onto the footpath for three days near the school gate.",
    category: "drainage",
    severity: "high",
    location: "School Road, Ward 4",
    area: "School Road",
    city: "Riverton",
    lat: 17.4021,
    lng: 78.4702,
  },
});
check("complaint creation", created.status === 201 && created.json.complaint?.id, JSON.stringify(created.json).slice(0, 250));
const complaintId = created.json.complaint?.id;

const mine = await call("/api/complaints?mine=true", { token: citizenToken });
check("my reports returns own complaint", mine.json.items?.length === 1);

const selfConfirm = await call(`/api/complaints/${complaintId}/confirm`, { method: "POST", token: citizenToken });
check("cannot confirm own report", selfConfirm.status === 409);

const update = await call(`/api/admin/complaints/${complaintId}`, {
  method: "PATCH",
  token: adminToken,
  body: { status: "progress", assignedDepartment: "Drainage", note: "Crew dispatched for desilting." },
});
check("staff status update", update.status === 200 && update.json.complaint.status === "progress", JSON.stringify(update.json).slice(0, 200));

const verify = await call(`/api/admin/complaints/${complaintId}/verification`, {
  method: "POST",
  token: adminToken,
  body: { decision: "field_check", note: "Send a field officer to confirm." },
});
check("verification decision stored", verify.status === 200, JSON.stringify(verify.json).slice(0, 200));

const after = await call(`/api/complaints/${complaintId}`);
check("data persists after refetch", after.json.complaint.status === "progress");
check("privacy: no reporter identity in detail", !/Smoke Tester|@example\.com/.test(JSON.stringify(after.json)));

const notifications = await call("/api/notifications", { token: adminToken });
check("admin notifications generated", notifications.json.items?.length > 0 && notifications.json.unread >= 1);

const aiStatus = await call("/api/ai/status");
const triage = await call("/api/ai/triage", {
  method: "POST",
  token: citizenToken,
  body: { text: "There is a broken streetlight outside my house." },
});
check("AI reports unconfigured honestly", aiStatus.json.configured === false && triage.status === 503, `triage ${triage.status}`);

const official = await call("/api/auth/register-official", {
  method: "POST",
  body: {
    name: "Smoke Official",
    email: `official${Date.now()}@example.org`,
    phone: `8${Date.now().toString().slice(-9)}`,
    password: "Testing12345",
    department: "Water Supply",
    designation: "Engineer",
    ward: "Ward 1",
    organisation: "RMC",
  },
});
check("official registration requires approval", official.status === 201 && official.json.status === "pending", JSON.stringify(official.json).slice(0, 160));

const pendingOfficialLogin = await call("/api/auth/login", {
  method: "POST",
  body: { identifier: `official${String(Date.now()).slice(0)}@example.org`, password: "Testing12345" },
});

const badPassword = await call("/api/auth/login", {
  method: "POST",
  body: { identifier: "admin@nagarmitra.local", password: "wrong-password" },
});
check("wrong password rejected", badPassword.status === 401);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
