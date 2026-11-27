# NagarMitra

NagarMitra is a civic issue reporting, community verification and municipal operations platform. Citizens report potholes, garbage, water leaks, drainage failures, broken streetlights and other local problems. Municipal staff verify reports, prioritise them with a transparent rule-based score, assign departments, track SLAs and record resolutions. Both sides see the same persisted record.

This repository contains a **working full-stack application**: React + TypeScript frontend, Express + TypeScript API, SQLite persistence, real authentication and roles, real Leaflet maps, server-side media uploads, and optional real AI.

---

## 1. What was built

| Area | Implementation |
| --- | --- |
| Authentication | Email **or** phone + password, scrypt hashing, opaque session tokens stored hashed, expiry, logout, password reset tokens, role-based access enforced by the API |
| Roles | `citizen`, `official` (requires admin approval), `admin` |
| Complaints | Manual, voice and AI-chat reporting; photo/video evidence; real coordinates; validation; duplicate guard; server-generated IDs (`CF-YYYY-NNNN`) |
| Voice | Browser Web Speech API transcription (English/Hindi/Telugu), microphone permission handling, audio playback, editable transcript, retry/delete, explicit failure messages |
| AI | Server-side OpenAI-compatible call for title/summary/category/severity/clarifying questions. Without `AI_API_KEY` the API returns `503 not configured` and the UI says so and uses a transparent keyword rule |
| Maps | Leaflet + OpenStreetMap with real coordinates, category icons inside priority-coloured markers, density circles, click-to-select location, geolocation, Nominatim address search/reverse geocoding |
| Media | `multer` uploads to disk with MIME/size validation, random filenames, DB records, authenticated serving |
| Community verification | Persistent confirmations (unique per citizen), admin approve / field-check / reject decisions with history |
| Notifications | Database-backed per-user notifications, unread count, mark read / mark all, 30 s polling in the admin bell |
| Admin | Overview, complaint list and detail, live map, analytics, verification, official-request approvals, profile, settings |
| Analytics | All figures computed from database records via SQL / derived selectors, CSV export |
| Privacy | Reporter name, phone, email and user id are **never** serialised into complaint responses — enforced server-side, not by CSS |
| Language | EN / HI / TE dictionary for shell, authentication, navigation and shared UI; preference persisted locally and on the user record |
| Delivery | Docker image, docker-compose, GitHub Actions CI, Render blueprint, `.env.example` |

---

## 2. Architecture

```
Browser (React 18 + Vite + Tailwind)
   │  fetch /api/*  (Bearer session token)
   ▼
Express 5 API (TypeScript, server/src)
   ├── auth middleware → sessions table (SHA-256 token hashes, scrypt passwords)
   ├── privacy serialiser → complaint DTO without reporter PII
   ├── rule-based priority engine (severity 35%, impact 25%, recurrence 20%, urgency 20%)
   ├── notification service
   ├── AI proxy (server-side key, OpenAI-compatible)
   └── media service (multer + disk, validated)
   ▼
SQLite (node:sqlite, WAL) — users, sessions, complaints, timeline,
confirmations, comments, verification_decisions, notifications, media,
audit_log, password_resets, counters
```

* **Frontend:** React 18, TypeScript (strict), Vite 5, Tailwind 3, React Router 6, Lucide icons, Leaflet/react-leaflet.
* **Backend:** Node 24, Express 5, TypeScript, `node:sqlite` (built-in — no native compilation), `multer`, `scrypt`/`randomBytes` from `node:crypto`, `tsx` for development.
* **Database:** SQLite in WAL mode. A single file, easy to run and back up; swap the data access layer for PostgreSQL when you need horizontal scale.
* **Maps:** OpenStreetMap tiles through Leaflet (no API key). Override tiles with `VITE_MAP_TILE_URL` if you use another provider.
* **AI:** any OpenAI-compatible chat-completions endpoint (`AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`).
* **Media:** local disk under `server/uploads`, served through `/api/media/:id` after a DB lookup. Use S3/R2 in multi-instance deployments.
* **Auth:** opaque random session tokens (not JWT) with server-side revocation and 7-day expiry.

### Project structure

```
src/                     React application
  components/            admin, charts, citizen, complaint, map, ui
  pages/auth             Login, Register, OfficialRegister, PendingApproval, ForgotPassword
  pages/citizen          Home, Explore, MyReports, ComplaintDetail, Profile, Manual/Voice/Chat report
  pages/admin            Overview, Complaints, Detail, Map, Analytics, Verification, Profile, Settings
  store/                 AuthContext, ComplaintsContext (API-backed), ToastContext
  lib/                   api client, i18n dictionary, derived analytics, constants
server/
  src/index.ts           entry point
  src/app.ts             Express app, CORS, security headers, SPA fallback
  src/db.ts              schema + helpers
  src/auth.ts            hashing, sessions, role middleware, rate limiting
  src/serialize.ts       privacy boundary
  src/seed.ts            idempotent demo seed
  src/data/seed-complaints.json   the original 20 demo complaints (with real coordinates)
  src/routes/            auth, complaints, admin, misc
  src/tests/api.test.ts  automated API tests
scripts/                 seed export + smoke test
```

---

## 3. Quick start (local)

Requirements: **Node.js 22.5+** (Node 24 recommended — the API uses the built-in `node:sqlite`) and npm.

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env
#    Edit .env and set ADMIN_PASSWORD (and AI_API_KEY if you want AI)

# 3. Run the API and the Vite dev server together
npm run dev
```

* Frontend: <http://127.0.0.1:5173>
* API: <http://127.0.0.1:8787/api/health>

On the first start the database is created and seeded automatically (only when the `users` table is empty). The console prints the demo accounts in development.

### Demo accounts (development)

| Role | Login | Password |
| --- | --- | --- |
| Administrator | `admin@nagarmitra.local` | `Admin@12345` (or `ADMIN_PASSWORD`) |
| Citizen | `ananya@nagarmitra.local` | `Citizen@12345` |
| Approved official | `arjun.desai@nagarmitra.local` | `Citizen@12345` |
| Pending official | `nandini.rao@example.org` | `Citizen@12345` |

Clicking the dev-only chips on the login screen fills these in. **In production, set a strong `ADMIN_PASSWORD`; the server refuses to seed without it.**

### Initial administrator provisioning

The first administrator is created from `ADMIN_EMAIL` + `ADMIN_PASSWORD` **only when the database has no users**. To change it later: sign in as admin → Profile → Change password. To start over, stop the server and delete `server/data/nagarmitra.db` (destroys data) or use `npm run seed:reset`.

---

## 4. Environment variables

See `.env.example` for the full annotated list. Key values:

| Variable | Purpose |
| --- | --- |
| `PORT`, `HOST` | API bind address (default `127.0.0.1:8787`; containers use `0.0.0.0`) |
| `DATABASE_PATH` | SQLite file path |
| `UPLOAD_DIR` | Media directory (must be writable/persistent) |
| `CORS_ORIGIN` | Comma-separated allowed browser origins |
| `SESSION_DAYS` | Session lifetime |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First-run administrator |
| `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | AI provider (leave key empty to disable AI honestly) |
| `VITE_API_URL` | API origin for production builds (empty = same origin / dev proxy) |
| `VITE_MAP_TILE_URL`, `VITE_MAP_ATTRIBUTION` | Optional map tile provider |

Only `VITE_*` variables reach the browser. The AI key is never sent to the client.

---

## 5. API overview

All routes are under `/api`. Authenticated routes use `Authorization: Bearer <token>`.

**Auth**
`POST /auth/register` · `POST /auth/register-official` · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` · `PATCH /auth/me` · `POST /auth/change-password` · `POST /auth/forgot-password` · `POST /auth/reset-password`

**Complaints**
`GET /complaints` (city/category/status/priority/q/mine/page) · `GET /complaints/stats` · `GET /complaints/:id` · `POST /complaints` · `PATCH /complaints/:id` · `POST /complaints/:id/confirm` · `POST /complaints/:id/comments` · `POST /complaints/media` · `GET /media/:id` · `POST /complaints/:id/media`

**Staff** (approved official or admin)
`GET /admin/complaints` · `GET /admin/analytics` · `GET /admin/verification` · `POST /admin/complaints/:id/verification` · `PATCH /admin/complaints/:id`

**Admin only**
`GET /admin/official-requests` · `POST /admin/official-requests/:id/decision` · `GET /admin/audit`

**Other**
`GET /health` · `GET /ai/status` · `POST /ai/triage` · `GET /notifications` · `POST /notifications/:id/read` · `POST /notifications/read-all`

Responses are JSON. Errors use `{ "error": "message" }` with appropriate 4xx/5xx codes. Login, AI and upload routes are rate limited.

---

## 6. Testing

```bash
npm run test:api       # 19 automated API tests (isolated temporary SQLite DB)
npm run typecheck:api  # backend TypeScript
npx tsc --noEmit       # frontend TypeScript
npm run build          # frontend build + backend compile
node scripts/smoke.mjs # live smoke test against http://127.0.0.1:8787
```

The API suite covers: health, login, wrong password, seed integrity, **reporter privacy**, citizen registration, role rejection, validation, complaint creation and persistence, ownership checks, self-confirmation rejection, status updates, verification decisions, notifications, pending-official restrictions, AI not-configured behaviour, analytics and 404 handling.

### Manual workflow checklist

**Citizen:** open the site → register → (auto sign-in) → change language → report manually → add photo/video → search or use current location → review → submit → copy complaint ID → My Reports → open detail → confirm another citizen's report → sign out.

**Staff:** sign in as admin → overview → complaints (search/filter) → open a complaint → verify → request field check → assign department + SLA → change status → add note → resolve → map → analytics → notifications → profile → update settings → refresh and confirm everything persists.

**Voice:** allow microphone → speak → verify the transcript matches your speech (not a fixed sentence) → edit → create draft → continue to the form. Chrome/Edge required.

---

## 7. Docker

```bash
cp .env.example .env    # set ADMIN_PASSWORD
docker compose up --build
# http://127.0.0.1:8787  (API + built SPA)
```

The image builds the frontend and backend, runs as a non-root user, exposes `/api/health`, and mounts named volumes for the database and uploads. `.env` is excluded from the image.

---

## 8. CI/CD

`.github/workflows/ci.yml` runs on every push/PR: `npm ci` → frontend typecheck → backend typecheck → production build → API tests → advisory `npm audit` → upload build artifacts. A failure in any blocking step fails the pipeline.

---

## 9. Deployment

### Option A — Render (single container, persistent disk)

1. Push the repository to GitHub.
2. Render → **New Blueprint** → select the repo (`render.yaml`).
3. Set `ADMIN_PASSWORD`, `ADMIN_EMAIL`, `CORS_ORIGIN` (your public URL) and optionally `AI_API_KEY`.
4. Deploy. The disk keeps `server/data` across restarts.
5. Open `/api/health` and confirm `{ "status": "ok" }`.

### Option B — Any Docker host

```bash
docker build -t nagarmitra .
docker run -d -p 8787:8787 \
  -e ADMIN_PASSWORD='a-long-random-secret' \
  -e CORS_ORIGIN='https://your-domain.example' \
  -v nagarmitra-data:/app/server/data \
  -v nagarmitra-uploads:/app/server/uploads \
  nagarmitra
```

Put TLS in front (Render/Railway/Fly/Nginx/Caddy). Because the API also serves the built SPA, no separate frontend host is required. If you prefer split hosting (e.g. Vercel for `dist` and Render for the API), set `VITE_API_URL` at build time and add the frontend origin to `CORS_ORIGIN`.

### Production checklist

- [ ] Strong `ADMIN_PASSWORD`, real `ADMIN_EMAIL`
- [ ] `CORS_ORIGIN` restricted to your real domain(s)
- [ ] `NODE_ENV=production`
- [ ] Persistent volumes for database **and** uploads
- [ ] `AI_API_KEY` set as a secret (never in the image or repo)
- [ ] HTTPS terminated in front of the container
- [ ] Back up `nagarmitra.db` (and WAL files) plus uploads
- [ ] `GET /api/health` monitored
- [ ] Email provider configured if you rely on password reset

---

## 10. Security notes

* Passwords: scrypt with per-user salt; never logged or returned.
* Sessions: 128-bit random tokens, stored only as SHA-256 hashes; expiry enforced on every request; logout and password change revoke sessions.
* Authorization is checked in the API for every mutation. Citizens cannot call staff routes; pending officials are rejected; only admins approve officials.
* Privacy: complaint DTOs exclude reporter name, phone, email and user id for citizens **and** staff.
* Uploads: MIME allow-list, per-kind size limits, random names, DB-gated serving, `nosniff`, path traversal prevented via `path.basename`.
* CORS allow-list, security headers, JSON body limit, rate limiting on auth/AI/upload, generic production error messages, audit log for staff actions.
* Secrets live in `.env` (git-ignored) and host secret stores; `.env.example` contains placeholders only.

---

## 11. Known limitations (honest)

1. **AI requires credentials.** Without `AI_API_KEY` no AI runs; the UI says so and uses a rule-based draft. No fake responses are generated.
2. **Speech recognition is browser/provider dependent.** Chrome/Edge send audio to their speech service; Firefox has no Web Speech API. The app fails visibly and offers manual entry.
3. **Email is not configured.** Password reset returns a token only in development. Connect an email provider before relying on it in production.
4. **Full UI translation is partial.** The dictionary covers authentication, navigation, shared labels and the login/registration experience in EN/HI/TE. Some deep admin and legacy page copy remains English.
5. **SQLite is single-instance.** Great for one container and small deployments; move to PostgreSQL before horizontal scaling.
6. **Media is on local disk.** Fine with a persistent volume; use S3/R2 for multiple instances or CDN delivery.
7. **No live websockets.** Notifications use 30-second polling (documented in the bell component).
8. **Nominatim public service** powers address search; it is rate limited and should be replaced with a paid geocoder for heavy production use.
9. **Demo data is seeded and labelled.** Seeded complaints show a "Seeded demo data" badge; real reports are stored alongside them in the same schema.

---

## 12. Useful commands

```bash
npm run dev            # API + frontend
npm run dev:api        # API only
npm run dev:web        # frontend only
npm run build          # production build (both)
npm start              # run the built API + SPA
npm run test:api       # API tests
npm run typecheck:api  # backend types
npm run seed:export    # regenerate seed JSON from the original dataset
npm run seed:reset     # delete the local database so the next start reseeds
```

The app name, logo (`public/nagarmitra-icon.png`), showcase asset, brand colours and typography are unchanged.
