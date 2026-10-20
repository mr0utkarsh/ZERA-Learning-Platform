# ZERA architecture plan

## Product direction

ZERA is a student-first learning platform focused on personalization, progress tracking, and AI-assisted learning. The frontend is a static HTML client backed by authenticated Express APIs and Prisma/MySQL persistence.

## Target future stack

Frontend:
- HTML, CSS, JavaScript
- Static hosting on GitHub Pages

Backend API:
- Node.js or Python service
- REST or GraphQL endpoints
- authentication and RBAC

Database:
- PostgreSQL
- Prisma ORM

AI integration:
- Google Gemini or similar provider
- environment-variable-based configuration

Email:
- Resend, Brevo, or SMTP

## Suggested entities

- User
- Profile
- Course
- Enrollment
- Subject
- Unit
- Topic
- Progress
- Syllabus
- Note
- PersonalNote
- Question
- Quiz
- QuizQuestion
- QuizAttempt
- MockTest
- MockTestAttempt
- StudyPlan
- StudyTask
- Bookmark
- Notification
- Achievement
- Streak
- Chat
- ChatMessage
- InterviewSession
- InterviewQuestion
- Resource
- Complaint
- SupportTicket
- Announcement
- AuditLog
- OTP

## Security expectations

- Password hashing
- secure auth middleware
- role-based authorization
- rate limiting
- input validation
- sanitization
- secure cookies or token storage
- strict CORS
- file validation and size limits
- database query protections
- audited logging

## Provider configuration

Gemini-powered features require `GEMINI_API_KEY`. Password reset and OTP delivery require `EMAIL_PROVIDER`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, and `EMAIL_FROM`. Missing provider configuration is returned as an explicit error; the backend does not fabricate responses.

`EMAIL_PROVIDER` selects which transport is attempted first; the other stays available as a fallback, and the provider that actually delivered the message is reported.

- `EMAIL_PROVIDER=smtp` — the SMTP relay is tried first, then the Brevo API.
- `EMAIL_PROVIDER=brevo` — the Brevo HTTPS API is tried first, then the SMTP relay.

`EMAIL_FROM` accepts either a bare address (`no-reply@zera.app`) or a display-name form (`ZERA Live <no-reply@zera.app>`); the address and the display name are resolved separately and used as the sender on both transports. Brevo only accepts senders that are verified on the account, so the configured value must match a verified sender.

### Deployment constraint: Railway blocks outbound SMTP

Railway disables outbound SMTP (ports 25, 465, 587, 2525) on the Free, Trial, and Hobby plans — SMTP is available from the Pro plan upward. On those plans the SMTP relay times out before it can authenticate, so `EMAIL_PROVIDER` must be `brevo` (or another provider's HTTPS API) for mail to be delivered from the deployed service. Adding the deployment's egress IPs to the provider's authorized-IP list does not help, because the connection never reaches the provider.

## GitHub Pages compatibility

- root-level HTML files
- relative asset references only
- no localhost references
- no runtime backend dependency
- static-friendly content and JavaScript logic

## Environment variable placeholders

```env
DATABASE_URL=
GEMINI_API_KEY=
JWT_SECRET=
EMAIL_API_KEY=
CORS_ORIGIN=
PORT=
```

## Notes

This design enables future growth without making false claims in the static frontend version currently stored in the repository.

## Deployed surface vs. legacy static files

The deployed frontend is the React application under `frontend/`, built to `frontend/dist` and served by Vercel. The Vercel project's Root Directory is `frontend`, so the deployment configuration lives in `frontend/vercel.json` — that is the file the build reads, and it is the single place that defines the build, the output directory and the rewrites.

The root-level HTML files, `css/`, `js/` and `assets/` are pre-React-migration leftovers and are **not** published as a set. The one exception is the administrator console. `admin-login.html`, `admin.html`, `admin-students.html` and `admin-invites.html` are the original static console, and `scripts/publish-legacy-admin.mjs` copies exactly those pages plus the stylesheets, scripts and icon they need into `frontend/dist` as the last step of `npm run build`. The legacy `index.html` is deliberately **not** copied, so the SPA keeps the site root.

The published routes are:

| Route | Purpose |
|---|---|
| `/login` | student sign-in (React) |
| `/admin-login.html` | administrator sign-in, posts to `POST /api/auth/admin/login` |
| `/admin` | admin console overview, rewritten to `/admin.html` |
| `/admin.html` | admin console overview |
| `/admin-students.html` | student management (search, filter, suspend, role, delete) |
| `/admin-invites.html` | administrator invitations (invite, approve, revoke) |

The console talks to the same backend as the SPA. `js/api.js` resolves its origin from `window.location.origin`, so the pages use the same-origin `/api` prefix that `frontend/vercel.json` proxies to the Railway backend, and they share one session in `localStorage` (`zera_token`, `zera_user`).

Access is guarded in two places: the backend requires an `ADMIN` or `SUPER_ADMIN` account for every `/api/admin` route, and the pages themselves check the stored session before rendering, sending a missing or non-administrator session back to `/admin-login.html`. Signing out of the console returns to `/admin-login.html`; signing out of the student app returns to `/login`.

The student sign-in page links to the console through `/admin-login.html`, so an administrator invited by email can reach the surface from the site the users already know.
