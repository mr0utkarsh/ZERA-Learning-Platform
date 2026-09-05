# ZERA Architecture

## High-level

```
┌──────────────┐      /api (proxied)      ┌──────────────────────┐      ┌────────────────┐
│ React SPA    │ ───────────────────────▶ │ Express API          │ ───▶ │ PostgreSQL     │
│ (Vite)       │  ◀─────────────────────  │  - auth middleware   │      │ (Prisma ORM)   │
│              │      JSON + httpOnly     │  - rate limiters     │      └────────────────┘
└──────────────┘      cookie session      │  - controllers       │
                                          │  - services          │      ┌────────────────┐
                                          │  - AI facade ────────┼────▶ │ AI provider    │
                                          └──────────┬───────────┘      │ (OpenAI compat)│
                                                     │                  └────────────────┘
                                          ┌──────────▼───────────┐      ┌────────────────┐
                                          │ Nodemailer           │ ───▶ │ SMTP provider  │
                                          └──────────────────────┘      └────────────────┘
```

The SPA never stores tokens; the session lives in an httpOnly cookie. All AI and
SMTP credentials exist only in the backend process environment.

## Backend layers

```
routes/        thin Express routers (path + middleware wiring only)
controllers/   request validation → orchestration → response envelope
services/      otpService (issue/verify, hashing, attempts, cooldown)
               emailService (SMTP transport, graceful skip)
               progressService (single source of truth for % math)
ai/            index.js facade + openaiProvider.js + validation.js
middleware/    auth (JWT cookie), requireAdmin/requireStudent, rate limits, errors
config/        env parsing + Prisma client
utils/         ApiError types, validators, JSON extraction, enums
```

### Request lifecycle
1. Helmet/CORS/cookie parsing → rate limiter bucket
2. Route matches; `authenticate` decodes JWT cookie, loads user, blocks suspended accounts
3. Role middleware where needed (`requireAdmin`)
4. Controller validates input → calls services/AI facade → writes via Prisma
5. Global error handler maps known errors to safe messages (5xx details hidden)

## AI subsystem

- **Facade** (`ai/index.js`) exposes typed feature functions:
  `analyzeSyllabus, generateNotes, solveDoubt, generateQuiz, generateStudyPlan,
  generateInterviewQuestion, evaluateInterviewAnswer, summarizeInterview`.
- **Provider** (`openaiProvider.js`) implements the OpenAI-compatible chat API over
  `fetch` with timeouts and mapped provider errors. Swapping providers = new provider
  module + one config switch; feature code unchanged.
- **Validation** (`validation.js`) — every structured response is rebuilt field-by-field:
  unknown fields dropped, lengths clamped, invalid questions skipped, malformed JSON
  retried then rejected. Nothing from the AI is ever executed or rendered as HTML.
- **Prompt-injection mitigation** — uploaded documents, user questions and candidate
  answers are wrapped in labelled data fences with an explicit system instruction to
  treat them as data, plus hard input-length caps.
- **Honest degradation** — `AI_PROVIDER=none` (or missing key) raises
  `AiNotConfiguredError` → HTTP 503 `AI_NOT_CONFIGURED`. UIs show a clear notice and
  never fabricate output. Study planning additionally falls back to a transparent,
  deterministic scheduler so the feature remains useful.

## Data & progress model

Progress is **always derived**, never stored as a mutable percentage:

```
Course → Subject → Unit → Chapter → Topic → Lesson
                                              │
LessonCompletion (userId, lessonId, completedAt)  ← the only progress fact
```

`progressService.getCourseProgress` walks a course tree once, counts completed
lessons per node, and rolls percentages up. New students and new courses
therefore start at exactly 0% by construction. Streaks aggregate distinct
active days across completions, quiz submissions and study sessions.

## Security model summary

| Concern | Mechanism |
| --- | --- |
| Credential storage | bcrypt-12 passwords; bcrypt-hashed OTPs |
| Session | JWT in httpOnly/SameSite cookie; Secure in prod; revocation via status checks |
| Brute force | Rate limiters (auth/OTP/AI) + OTP attempt caps + cooldown |
| Injection | Prisma parameterized queries; strict input validation; JSON body limits |
| XSS | React escaping + custom Markdown renderer that never emits raw HTML |
| Secrets | Env-only; error handler strips internals; nothing secret in GET responses |
| Uploads | Mimetype+extension checks, size cap, immediate deletion after parsing |
| Admin separation | Role enforced on every `/api/admin` route; tested explicitly |

## Frontend architecture

- **Routing**: public pages, student shell, admin shell; lazy-loaded route components.
- **AuthContext** boots from `/auth/me`; guards (`RequireStudent`, `RequireAdmin`)
  complement server-side checks (defense in depth, not a substitute).
- **API client**: fetch wrapper with credentials + typed errors (`status`, `code`).
- **States everywhere**: loading spinners, error banners with retry, empty states with
  next-best actions, and explicit "AI not configured" notices.
- **Accessibility**: semantic landmarks, labels, keyboard-operable trees/options,
  focus-visible styles, honest `aria-live` timers.
