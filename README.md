# ZERA – Your New Era of Learning

ZERA is a student-first AI-powered personalized learning platform. Students
register, complete academic onboarding, upload a syllabus, confirm its
structure, and receive a personalized study workflow backed by a real backend,
persistent database, and configurable AI providers.

<<<<<<< HEAD
## Architecture

- `frontend/` — React 18 + TypeScript + Vite + Tailwind CSS (Vite build, Vercel-ready).
- `backend/` — Node.js ESM + Express 4 + Prisma 5 + PostgreSQL (Railway-ready).
- Database — Supabase PostgreSQL, migrations tracked in `backend/prisma/migrations`.
- File storage — private Supabase Storage buckets with short-lived signed URLs.
- AI — server-side provider abstraction with failover `gemini -> groq -> openrouter -> deepseek`. Keys stay server-side.
- Email — SMTP (Brevo relay configured). SMS — Brevo transactional API with honest capability reporting.
=======
This repository contains a static frontend and an Express/Prisma backend with authenticated MySQL persistence. AI and SMTP features require external provider configuration.

## Core idea

ZERA gives students a structured path through their learning journey without forcing them into paywalls or generic content. It helps learners:

- understand their syllabus
- generate notes and revision material
- practice with quizzes and mock tests
- plan study sessions
- track course progress
- build a study streak
- save bookmarks and personal notes
- prepare for interview-style questions

## Features

- Premium responsive landing experience
- About and feature pages for the product narrative
- Authenticated AI tools hub
- Dashboard with course progress and next-step guidance
- Syllabus tracking with states for not started, active, and complete
- Persisted quiz and mock test assessments
- Study plan generation and task tracking
- AI mock interview integration
- Bookmarks, notifications, and personal notes
- Authentication UI for login, signup, forgot password, and reset flows
- Admin login and admin-ready structure
- Progress, streak, and achievements logic using localStorage

## Frontend architecture

- Static HTML pages at the repository root
- Shared CSS in `css/`
- Shared JavaScript in `js/`
- Assets under `assets/`
- Documentation in `docs/architecture.md`
>>>>>>> 4804780593c11e68ae22b39c559dc624c40d29a7

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

<<<<<<< HEAD
```bash
cd frontend
VITE_API_URL=https://<your-backend> npm run build
```

## Deployment

- Frontend → Vercel (project root `frontend/`, `npm run build` → `dist/`).
- Backend → Railway (start command `npx prisma migrate deploy && node src/server.js`, health check `/api/health`).
- Database → Supabase PostgreSQL. Apply migrations with `prisma migrate deploy` at deploy time.
- Never commit secrets. Service-role keys stay on the server.
=======
## External configuration

Set `DATABASE_URL`, `JWT_SECRET`, and `PASSWORD_RESET_TOKEN_SECRET`. Live Gemini requires `GEMINI_API_KEY`. Password reset and OTP delivery require `EMAIL_PROVIDER=smtp`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, and `CLIENT_URL`.
>>>>>>> 4804780593c11e68ae22b39c559dc624c40d29a7

## Honesty policy

Every feature reports its real state. AI, OCR, storage, and SMS endpoints
return explicit `503/502` errors naming the missing configuration instead of
fabricating results. Performance analytics derive only from real completed
activities and show an empty state for new students.

## Security notes

- Custom JWT auth is the single authoritative system (Supabase Auth is not used).
- Ownership (`userId`) is enforced server-side on every private resource.
- No fabricated scores, streaks, historical data, or provider delivery claims.

