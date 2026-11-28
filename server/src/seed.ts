import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "./auth.js";
import { config, ROOT } from "./config.js";
import { execute, nowIso, queryOne, transaction } from "./db.js";
import { priorityFromScore, scoreFromFactors } from "./priority.js";
import type { PriorityFactors, StatusId } from "./types.js";

const SEED_FILE = path.join(ROOT, "server", "src", "data", "seed-complaints.json");

export interface SeedComplaint {
  id: string;
  title: string;
  description: string;
  aiSummary: string;
  category: string;
  status: StatusId;
  factors: PriorityFactors;
  location: string;
  area: string;
  ward?: string;
  city?: string;
  date: string;
  photo?: string;
  lat: number;
  lng: number;
  upvotes: number;
  why: string[];
  resolutionNote?: string;
}

const DEMO_CITIZENS = [
  { name: "Ananya Rao", email: "ananya@nagarmitra.local", phone: "9000000001", area: "School Road" },
  { name: "Rahul Verma", email: "rahul@nagarmitra.local", phone: "9000000002", area: "Maple Market" },
  { name: "Priya Nair", email: "priya@nagarmitra.local", phone: "9000000003", area: "Central Park" },
  { name: "Imran Sheikh", email: "imran@nagarmitra.local", phone: "9000000004", area: "Riverside" },
  { name: "Devika Menon", email: "devika@nagarmitra.local", phone: "9000000005", area: "Rosewood" },
];

const remaining: Record<string, string> = {
  submitted: "Complaint logged and acknowledgement sent to the reporter.",
  review: "Ward officer validating details and assigning a field team.",
  progress: "Field crew dispatched. Repair work is underway at the location.",
  resolved: "Work verified on site and the complaint has been closed.",
};

const ORDER: StatusId[] = ["submitted", "review", "progress", "resolved"];

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T09:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function seedDatabase() {
  const existing = queryOne<{ count: number }>("SELECT COUNT(*) AS count FROM users")?.count ?? 0;
  if (existing > 0) return { seeded: false };

  if (!config.adminPassword) {
    throw new Error(
      "ADMIN_PASSWORD is required for the first production start so the initial administrator is not created with a default password."
    );
  }

  const at = nowIso();
  transaction(() => {
    execute(
      `INSERT INTO users (id, name, email, phone, password_hash, role, official_status, city, language, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'admin', 'approved', 'Hyderabad', 'en', ?, ?)`,
      [
        "user-admin",
        "Meera Shah",
        config.adminEmail,
        "9000000000",
        hashPassword(config.adminPassword),
        at,
        at,
      ]
    );

    DEMO_CITIZENS.forEach((citizen, index) => {
      execute(
        `INSERT INTO users (id, name, email, phone, password_hash, role, city, area, language, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'citizen', 'Hyderabad', ?, 'en', ?, ?)`,
        [
          `user-citizen-${index + 1}`,
          citizen.name,
          citizen.email,
          citizen.phone,
          hashPassword(config.demoCitizenPassword),
          citizen.area,
          at,
          at,
        ]
      );
    });

    execute(
      `INSERT INTO users (id, name, email, phone, password_hash, role, official_status, department, designation, ward, organisation, city, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'official', 'approved', 'Roads & Public Works', 'Ward Engineer', 'Ward 4', 'Greater Hyderabad Municipal Corporation (GHMC)', 'Hyderabad', ?, ?)`,
      [
        "user-official-1",
        "Arjun Desai",
        "arjun.desai@nagarmitra.local",
        "9000000010",
        hashPassword(config.demoCitizenPassword),
        at,
        at,
      ]
    );

    execute(
      `INSERT INTO users (id, name, email, phone, password_hash, role, official_status, department, designation, ward, organisation, city, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'official', 'pending', 'Water Supply', 'Assistant Engineer', 'Ward 2', 'Greater Hyderabad Municipal Corporation (GHMC)', 'Hyderabad', ?, ?)`,
      [
        "user-official-pending",
        "Nandini Rao",
        "nandini.rao@example.org",
        "9000000011",
        hashPassword(config.demoCitizenPassword),
        at,
        at,
      ]
    );

    if (fs.existsSync(SEED_FILE)) {
      const rows = JSON.parse(fs.readFileSync(SEED_FILE, "utf8")) as SeedComplaint[];
      rows.forEach((row, index) => {
        const reporterId = `user-citizen-${(index % DEMO_CITIZENS.length) + 1}`;
        const score = scoreFromFactors(row.factors);
        const priority = priorityFromScore(score);
        execute(
          `INSERT INTO complaints
           (id, title, description, ai_summary, ai_source, category, status, priority, score, factors_json,
            lat, lng, address, area, ward, city, reporter_id, is_demo, photo, why_json, resolution_note,
            created_at, updated_at, base_upvotes)
           VALUES (?, ?, ?, ?, 'seeded-demo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
          [
            row.id,
            row.title,
            row.description,
            row.aiSummary,
            row.category,
            row.status,
            priority,
            score,
            JSON.stringify(row.factors),
            row.lat,
            row.lng,
            row.location,
            row.area,
            row.ward ?? null,
            row.city ?? "Hyderabad",
            reporterId,
            row.photo ?? null,
            JSON.stringify(row.why ?? []),
            row.resolutionNote ?? null,
            `${row.date}T09:00:00.000Z`,
            `${row.date}T09:00:00.000Z`,
            row.status === "resolved" ? 0 : row.upvotes,
          ]
        );

        const currentIndex = ORDER.indexOf(row.status);
        ORDER.forEach((step, stepIndex) => {
          execute(
            `INSERT INTO timeline (id, complaint_id, status, label, note, done, current, seq, at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              `${row.id}-step-${stepIndex}`,
              row.id,
              step,
              { submitted: "Report received", review: "Under review", progress: "Work in progress", resolved: "Resolved" }[step],
              step === "resolved" && row.resolutionNote ? row.resolutionNote : remaining[step],
              stepIndex <= currentIndex ? 1 : 0,
              stepIndex === currentIndex ? 1 : 0,
              stepIndex,
              addDays(row.date, [0, 1, 3, 6][stepIndex]),
            ]
          );
        });

        if (index % 3 === 0) {
          execute(
            `INSERT INTO comments (id, complaint_id, user_id, text, badge, created_at)
             VALUES (?, ?, ?, ?, 'Citizen', ?)`,
            [
              `${row.id}-comment`,
              row.id,
              `user-citizen-${((index + 2) % DEMO_CITIZENS.length) + 1}`,
              "Noticed this issue worsening over the past week. Glad someone reported it on NagarMitra.",
              `${row.date}T12:00:00.000Z`,
            ]
          );
        }
      });
    }

    execute("INSERT INTO counters (name, value) VALUES (?, ?)", [
      `complaint-${new Date().getFullYear()}`,
      150,
    ]);
  });

  return { seeded: true };
}
