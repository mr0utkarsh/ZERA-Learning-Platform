# Deploying ZERA

ZERA is designed for a standard three-piece deployment:

```
Frontend (static)  →  Backend (Node)  →  PostgreSQL
        ↘                  ↙
     SMTP provider · AI provider
```

## 1. Database (PostgreSQL)

Provision any managed PostgreSQL (Neon, Supabase, Railway, RDS…) and note the
connection string.

```bash
cd backend
DATABASE_URL="postgresql://USER:PASS@HOST:5432/zera?schema=public" npx prisma migrate deploy
```

> The repo ships with `prisma/schema.postgresql.prisma` as the canonical schema.
> `scripts/sync-prisma-db.js` automatically selects it whenever `DATABASE_URL`
> is not a `file:` URL, so Prisma commands target PostgreSQL in any environment
> where the variable points there.

## 2. Backend (Render / Railway / VPS)

1. Deploy the `backend/` directory (Node ≥ 20).
2. Set environment variables (see `.env.example`), at minimum:
   - `DATABASE_URL` (PostgreSQL)
   - `JWT_SECRET` — generate with `openssl rand -hex 32`
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://your-app.vercel.app` (CORS + cookie policy)
   - `BACKEND_URL=https://api.your-domain.com`
   - SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`
   - AI: `AI_PROVIDER=openai`, `AI_API_KEY`, optional `AI_MODEL`, `OPENAI_BASE_URL`
   - **Leave `DEV_SHOW_OTP` unset/false in production** (OTPs must travel only by email)
3. Start command: `npm start` (runs `src/server.js`).
4. Health check: `GET /api/health`.

Notes:
- In production the session cookie is `Secure` + `SameSite=None`, so the frontend
  must be served over HTTPS and call the backend with credentials.
- `uploads/` only holds transient syllabus files (deleted right after parsing);
  no persistent storage is required.

## 3. Frontend (Vercel / Netlify / static host)

1. Build: `npm run build --prefix frontend` → `frontend/dist`.
2. Host `dist` on any static provider.
3. Route `/api/*` to the backend:
   - **Vercel**: add a rewrite in `vercel.json`:
     ```json
     { "rewrites": [ { "source": "/api/:path*", "destination": "https://api.your-domain.com/api/:path*" } ] }
     ```
   - **Netlify**: `_redirects` → `/api/* https://api.your-domain.com/api/:splat 200`
   - **Nginx**: `location /api/ { proxy_pass http://backend:5000; proxy_set_header Host $host; }`
   - Alternatively point the SPA at the backend URL directly and keep CORS configured.
4. SPA fallback: serve `index.html` for all non-asset routes.

## 4. Email

Any SMTP provider works (SES, Mailgun, Postmark, Resend SMTP, Gmail app-password…).
Fill the `SMTP_*` variables. When unconfigured, ZERA keeps working: OTP emails are
skipped and (outside production) codes surface in API responses for development.

## 5. AI

`AI_PROVIDER=openai` works with OpenAI or any compatible endpoint
(`OPENAI_BASE_URL`). Keys remain server-side. If you deploy without a key, keep
`AI_PROVIDER=none` — every AI feature will show an honest “not configured” state,
and study planning falls back to the built-in scheduler.

## 6. Post-deploy checklist

- [ ] `GET /api/health` returns `status: ok`, and reports `aiConfigured` / `emailConfigured` truthfully
- [ ] Signup → email arrives → OTP verifies
- [ ] Forgot-password reset works end-to-end
- [ ] Student cannot call `/api/admin/stats` (403)
- [ ] Admin login at `/admin/login` works; student login is rejected there
- [ ] Course creation → lesson completion updates percentages
- [ ] Quiz generate (with AI key) → attempt → submit → review
- [ ] Frontend served over HTTPS with working `/api` proxy
