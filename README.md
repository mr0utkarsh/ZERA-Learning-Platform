# ZERA – Your New Era of Learning

ZERA is a student-first AI-powered personalized learning platform. Students
register, complete academic onboarding, upload a syllabus, confirm its
structure, and receive a personalized study workflow backed by a real backend,
persistent database, and configurable AI providers.

## Architecture

- `frontend/` — React 18 + TypeScript + Vite + Tailwind CSS (Vite build, Vercel-ready).
- `backend/` — Node.js ESM + Express 4 + Prisma 5 + PostgreSQL (Railway-ready).
- Database — Supabase PostgreSQL, migrations tracked in `backend/prisma/migrations`.
- File storage — private Supabase Storage buckets with short-lived signed URLs.
- AI — server-side provider abstraction with failover `gemini -> groq -> openrouter -> deepseek`. Keys stay server-side.
- Email — SMTP (Brevo relay configured). SMS — Brevo transactional API with honest capability reporting.

## Local development

Backend (port 5000):

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL + secrets
npm install
npx prisma generate
npx prisma migrate deploy   # or `prisma migrate dev` for local iteration
npm run dev
```

Tests (disposable real PostgreSQL via PGlite, never touches production):

```bash
cd backend
npm test
```

Frontend (Vite dev on :5500, proxies `/api` to the backend):

```bash
cd frontend
npm install
npm run dev
```

Production build:

```bash
cd frontend
VITE_API_URL=https://<your-backend> npm run build
```

## Deployment

- Frontend → Vercel (project root `frontend/`, `npm run build` → `dist/`).
- Backend → Railway (start command `npx prisma migrate deploy && node src/server.js`, health check `/api/health`).
- Database → Supabase PostgreSQL. Apply migrations with `prisma migrate deploy` at deploy time.
- Never commit secrets. Service-role keys stay on the server.

## Honesty policy

Every feature reports its real state. AI, OCR, storage, and SMS endpoints
return explicit `503/502` errors naming the missing configuration instead of
fabricating results. Performance analytics derive only from real completed
activities and show an empty state for new students.

## Security notes

- Custom JWT auth is the single authoritative system (Supabase Auth is not used).
- Ownership (`userId`) is enforced server-side on every private resource.
- No fabricated scores, streaks, historical data, or provider delivery claims.

