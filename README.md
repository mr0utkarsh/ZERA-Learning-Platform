# ZERA — Your New Era of Learning

**ZERA** is an AI-powered, student-focused personalized learning platform.
One account covers the entire study journey: structure your syllabus, study lessons,
generate notes, clear doubts with an AI tutor, take quizzes and timed mock tests,
practice previous-year questions, follow a personalized study plan, analyze your
performance and rehearse interviews — with honest, real-data progress tracking.

There is **no teacher module** — every screen is built for the learner.

---

## ✨ Features

| Area | What ZERA does |
| --- | --- |
| **Accounts** | Signup, login, logout, email-verification OTP, forgot/reset password with OTP (bcrypt-hashed, brute-force limited) |
| **Courses** | Course → Subject → Unit → Chapter → Topic → Lesson hierarchy; manual builder + syllabus upload (PDF/DOCX/TXT) with AI structure analysis and a human review step |
| **Progress** | Completion % computed from real lesson completions at every level; streaks; study-time logging; new students and new courses always start at **0%** |
| **AI notes** | Structured notes (headings, key points, examples, terms, summary, exam focus) for any hierarchy level, stored per user |
| **Handwritten-style notes** | Readable handwritten-style study sheets (styled rendering, not fake handwriting) — preview, save, print/download |
| **Doubt solver** | Conversational AI tutor with history, lesson context and follow-ups |
| **Quizzes** | AI-generated MCQ / True-False / Short-answer quizzes, server-side grading, attempt history, post-submit review |
| **Mock tests** | Timed tests, question palette, auto-saved answers (refresh-safe), auto-submit on timeout, full analysis after submission |
| **PYQs** | Search/filter by subject, year, exam, topic, difficulty; self-checked attempts; solutions unlock after attempting; bookmarks; optional AI explanations |
| **Performance** | Real-data analytics: accuracy, subject-wise averages, strong/weak areas, trend; explicit "not enough data" state |
| **Study plans** | Daily minutes + preferred days + target date → persistent schedule (AI when configured, deterministic scheduler otherwise); checkable tasks |
| **Mock interviews** | Role/domain/difficulty interviews; per-answer scoring (technical/communication/relevance/clarity); final summary with suggested topics |
| **Admin** | Separate `/admin/login`, role-gated APIs, student search/filter, suspend/restore/remove, live system statistics |
| **Admin team management** | SUPER_ADMIN invites admins (one-time code), approves/rejects pending accounts, revokes/restores/deletes access — all enforced server-side |

---

## 🧱 Tech stack

- **Frontend** — React 18 + Vite, React Router (code-split pages), hand-rolled design system (no UI framework), safe Markdown renderer (no raw HTML injection)
- **Backend** — Node.js + Express (REST, consistent JSON envelope), httpOnly-cookie sessions (JWT)
- **Database** — Prisma ORM; **PostgreSQL** is the production target (`prisma/schema.postgresql.prisma`). For zero-config local development a **SQLite** variant (`prisma/schema.sqlite.prisma`) is synced automatically by `scripts/sync-prisma-db.js` based on `DATABASE_URL`.
- **Auth** — bcrypt password hashing, JWT in httpOnly cookies, hashed OTPs with expiry + attempt caps, rate limiting
- **Email** — Nodemailer (SMTP via env vars). When SMTP isn’t configured, sending is skipped gracefully and OTPs are surfaced in the API response **in development only** (`DEV_SHOW_OTP=true`).
- **AI** — provider abstraction in `backend/src/ai/` supporting **OpenAI**, **Groq**, and **Google Gemini**. Configure at runtime in **Admin Panel → Settings → API Configuration** (keys stored AES-256-GCM encrypted, never returned in full), or via `AI_PROVIDER`/`AI_API_KEY` env vars. Keys live only on the server; every AI output is validated/trimmed before storage. When unconfigured, endpoints return a clear `AI_NOT_CONFIGURED` state — **never fake results**.

---

## 📁 Project structure

```
zera/
├── frontend/                  # React + Vite SPA
│   ├── src/
│   │   ├── components/        # Markdown renderer, UI primitives
│   │   ├── context/           # AuthContext
│   │   ├── layouts/           # Public / Student / Admin shells
│   │   ├── pages/             # Lazy-loaded route pages (+ auth/, admin/)
│   │   ├── services/          # API client
│   │   ├── utils/             # Formatting helpers
│   │   └── styles.css         # Design system
│   ├── index.html
│   ├── vite.config.js         # /api proxy → backend
│   └── package.json
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma              # active schema (synced)
│   │   ├── schema.postgresql.prisma   # canonical production schema (enums)
│   │   ├── schema.sqlite.prisma       # local-dev/test variant
│   │   └── seed.js                    # dev-only seed
│   ├── scripts/
│   │   ├── sync-prisma-db.js          # picks schema by DATABASE_URL
│   │   └── run-tests.js               # isolated test DB + vitest
│   ├── src/
│   │   ├── ai/                # provider abstraction + response validation
│   │   ├── config/            # env config + Prisma client
│   │   ├── controllers/       # one module per resource
│   │   ├── middleware/        # auth, role guards, rate limits, error handler
│   │   ├── routes/            # /api/* routers
│   │   ├── services/          # email, OTP, progress calculation
│   │   ├── utils/             # errors, validation, enums, response envelope
│   │   ├── app.js             # Express app (exported for tests)
│   │   └── server.js          # HTTP entrypoint
│   ├── tests/                 # vitest + supertest (36 tests)
│   └── uploads/               # transient syllabus uploads (deleted after parse)
├── docs/                      # API reference, architecture, deployment
├── .env.example
├── .gitignore
└── package.json               # root scripts (dev/build/test)
```

---

## 🚀 Getting started

### 1. Prerequisites
- Node.js ≥ 20
- PostgreSQL (production) — *or nothing extra for local dev (SQLite)*

### 2. Install

```bash
cd zera
npm run install:all     # installs root, backend and frontend deps
```

### 3. Configure

```bash
cp .env.example backend/.env
# then edit backend/.env (JWT_SECRET, AI keys, SMTP, DATABASE_URL…)
```

Key variables (full list in `.env.example`):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | `postgresql://…` in production, `file:./dev.db` for local SQLite |
| `JWT_SECRET` | Long random string — required to be strong in production |
| `SMTP_HOST/PORT/USER/PASSWORD`, `EMAIL_FROM` | Email delivery |
| `DEV_SHOW_OTP` | Dev-only: return OTPs in API responses when SMTP is off |
| `AI_PROVIDER` | `openai`, `groq`, `gemini`, or `none` (env fallback — admin settings take precedence) |
| `AI_API_KEY`, `AI_MODEL`, `OPENAI_BASE_URL` | AI provider settings |
| `CONFIG_ENCRYPTION_KEY` | Optional; encrypts admin-saved secrets at rest (falls back to `JWT_SECRET`) |
| `SEED_ADMIN_*`, `SEED_STUDENT_*` | Dev seed credentials |

### 4. Database

```bash
cd backend
npm run db:migrate      # sync schema + run migrations (dev)
npm run db:seed         # dev-only sample data (guarded against production)
```

Prisma commands:

```bash
npx prisma generate
npx prisma migrate dev --name <name>
npx prisma migrate deploy     # production
npx prisma studio
```

### 5. Run

```bash
# from the repo root
npm run dev               # backend :5000 + frontend :5173 concurrently
npm run dev:backend       # backend only
npm run dev:frontend      # frontend only
```

Open http://localhost:5173 — the Vite dev server proxies `/api` to the backend.

### 6. Test

```bash
npm test                  # runs backend suite in an isolated SQLite test DB
```

### 7. Production build

```bash
npm run build             # builds frontend to frontend/dist
npm start                 # runs the API (backend)
```

Serve `frontend/dist` from any static host and route `/api/*` to the backend
(see `docs/DEPLOYMENT.md`).

---

## 🔌 API overview

All routes return a consistent envelope:

```json
{ "success": true,  "data": { }, "message": "…" }
{ "success": false, "message": "…", "code": "OPTIONAL_CODE" }
```

| Prefix | Purpose |
| --- | --- |
| `/api/auth` | signup, login, logout, me, verify-email, resend-email-otp, forgot-password, verify-reset-otp, reset-password |
| `/api/users` | profile patch, change-password |
| `/api/courses` | courses CRUD, hierarchy builders, lesson access/completion, personal notes, study sessions |
| `/api/progress` | overall progress + aggregated dashboard |
| `/api/syllabus` | upload+analyze, confirm reviewed structure |
| `/api/notes` | generate (AI), list, get, delete |
| `/api/doubts` | conversations CRUD + `ask` |
| `/api/quizzes` | generate, list, attempts lifecycle (`attempts/:id/answers`, `/submit`, `/review`) |
| `/api/pyqs` | list/filter, attempt, solution, bookmark, AI explain |
| `/api/performance` | analytics from real attempts |
| `/api/study-plans` | generate, active plan, task toggle, abandon |
| `/api/interviews` | start, answer, sessions |
| `/api/admin` | settings (AI provider/keys), stats, students list/detail, suspend/restore/delete (**role ADMIN enforced server-side**) |
| `/api/contact` | contact form delivery |

Full request/response reference: [`docs/API.md`](docs/API.md).

---

## 🔒 Security notes

- Passwords hashed with **bcrypt (cost 12)**; never returned by any endpoint.
- Sessions: JWT in **httpOnly, SameSite cookies** (Secure in production). No tokens in JS storage.
- **OTP hardening**: bcrypt-hashed codes, 8-minute expiry, max 5 attempts, 45s resend cooldown, single-use, replay-proof reset flow.
- **Rate limiting** on general API, auth, OTP and AI endpoints.
- **Authorization on the backend** for every protected route; admin endpoints additionally require `role: ADMIN` (verified in tests).
- **Input validation** everywhere; Prisma parameterization prevents SQL injection.
- **XSS-safe rendering**: the frontend renders Markdown via a custom parser that emits React elements only — raw HTML from AI/users is never injected.
- **AI safety**: keys server-side only; structured-output validation; size caps; prompt-injection fencing for uploaded documents; malformed JSON retried then rejected.
- **Secrets at rest**: admin-saved API keys are **AES-256-GCM encrypted** in the database, are never returned in full by any endpoint (masked only), never logged, and never committed. The key is derived from `CONFIG_ENCRYPTION_KEY` (or `JWT_SECRET`).
- **Uploads**: mimetype + extension verification, 5 MB cap, files deleted immediately after text extraction.
- Error handler never leaks secrets or stack traces (hints only in development for 5xx).

---

## 🧪 Testing

`npm test` runs 65 vitest + supertest tests in an isolated database:

- Signup validation (email format, password strength, duplicates, mismatch)
- Login/logout/session cookies, hashed-password storage
- OTP verification, attempt limits, single-use replay protection
- Full forgot/reset password flow, enumeration resistance
- Suspended-account blocking (login + existing sessions)
- Progress math: new student/course = 0%, proportional updates, idempotent completion, cross-user access denial
- Quiz scoring: server grading, no answers before submission, resume, refresh-safe persistence, review payload, AI-not-configured honesty
- Authorization: students blocked from admin APIs, admin lifecycle actions, self-action prevention
- Hierarchy CRUD: rename/delete at every level (course → subject → unit → chapter → topic → lesson), cascade deletes (incl. completion rows), validation rejects, cross-user 403s, idempotent duplicate quiz submit
- AI-unconfigured honesty guards: doubts/interviews/notes return 503 with no orphan rows; course trees include lesson titles
- Admin API configuration: settings endpoints SUPER_ADMIN-only, keys stored **encrypted** (plaintext never in the DB), responses masked-only, provider/key validation, env fallback
- Admin team management: SUPER_ADMIN-only roster; invite → accept → approve lifecycle, reject deletes, revoke blocks live sessions, restore; self- and SUPER_ADMIN-protection; duplicate-email conflicts

---

## ☁️ Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Recommended topology:

- **Frontend** → Vercel / Netlify / any static host (build output `frontend/dist`)
- **Backend** → Render / Railway / VPS (`npm start`)
- **Database** → managed PostgreSQL (Neon, Supabase, RDS…)
- **Email** → any SMTP provider (SES, Mailgun, Postmark…)
- **AI** → OpenAI or any compatible endpoint

---

## Current known limitations

- The PostgreSQL schema and migration history require a production-database verification pass before deployment. The local test runner uses an isolated SQLite database.
- Production startup must be configured with strong `JWT_SECRET` and `CONFIG_ENCRYPTION_KEY` values; the current audit identified a fail-closed JWT configuration gap.
- JWT sessions are stateless, so password changes and resets do not currently revoke already-issued tokens before their expiry.
- Production cookies use `SameSite=None`, but dedicated CSRF token or strict origin protection is not yet implemented for all state-changing requests.
- AI prompt-injection fencing does not yet cover every user-controlled context label used by the AI facade.
- Interview state recovery after a partial AI/provider failure and complete upload cleanup on every failure path need additional hardening.
- SMTP must be configured for production OTP delivery. Development-only OTP exposure must remain disabled in production.
- Frontend unit, accessibility, and browser end-to-end coverage is limited. React Router currently has two moderate dependency advisories requiring a breaking-version upgrade.
- AI features require valid provider configuration. When unavailable, AI endpoints intentionally return `AI_NOT_CONFIGURED` instead of fabricated output.

---

## 🌱 Development seed

`npm run db:seed` (refuses to run when `NODE_ENV=production`) creates:

- the initial **SUPER_ADMIN** from `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` (bcrypt-hashed; the password itself is never printed or committed)
- `admin@zera.local / Admin@12345` (ADMIN)
- `student@zera.local / Student@12345` (STUDENT, with a sample CS course)
- 4 sample PYQs

This is clearly-labeled **development sample data**, never used by production screens.
