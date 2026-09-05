# ZERA API Reference

Base URL: `/api` · Auth: httpOnly cookie (`zera_token`) set by `/auth/login` / `/auth/signup`.
Envelope: `{ success, data, message }` on success · `{ success: false, message, code? }` on error.
Roles: `STUDENT`, `ADMIN`, `SUPER_ADMIN`. Admin-panel endpoints need ADMIN; admin roster management and API-key configuration need SUPER_ADMIN. Admin account lifecycle: INVITED → (accept) → PENDING → (approve) → ACTIVE; `revoke` → SUSPENDED.

## Auth — `/api/auth`

| Method | Path | Auth | Body | Notes |
| --- | --- | --- | --- | --- |
| POST | `/signup` | – | `{ name, email, password, confirmPassword? }` | Creates STUDENT, sends verification OTP, sets session. Dev w/o SMTP: `data.devOtp` |
| POST | `/login` | – | `{ email, password }` | Same generic error for unknown email / wrong password |
| POST | `/logout` | ✓ | – | Clears cookie |
| GET | `/me` | ✓ | – | Current user |
| POST | `/verify-email` | ✓ | `{ code }` | Consumes OTP, sets `emailVerified` |
| POST | `/resend-email-otp` | ✓ | – | 45s cooldown enforced |
| POST | `/forgot-password` | – | `{ email }` | Always 200 (anti-enumeration); dev exposes `devOtp` only if account exists |
| POST | `/verify-reset-otp` | – | `{ email, code }` | Validates without consuming |
| POST | `/reset-password` | – | `{ email, code, password, confirmPassword? }` | Consumes OTP, rehashes password |
| POST | `/accept-admin-invite` | – | `{ email, code, password, confirmPassword? }` | Invitee redeems a SUPER_ADMIN invitation, sets their own password → status PENDING (awaiting approval). Generic error if no matching invitation. |

## Users — `/api/users` (auth required)

| Method | Path | Body |
| --- | --- | --- |
| PATCH | `/profile` | any of `{ name, bio, institution, gradeLevel, avatarColor (#rrggbb), preferences {} }` |
| POST | `/change-password` | `{ currentPassword, newPassword }` |

## Courses — `/api/courses` (auth required)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | List own + global courses with computed progress |
| POST | `/` | Create course `{ name, description?, institution? }` |
| GET | `/:id` | Full tree: subjects → units → chapters → topics → lessons + per-level progress |
| PATCH | `/:id` | Rename / edit description of **own** course `{ name?, description? }` |
| DELETE | `/:id` | Own courses only — cascades to the whole tree + completions |
| POST | `/:courseId/subjects` | `{ name, code? }` (own courses only) |
| PATCH | `/subjects/:subjectId` | `{ name?, code? }` (own courses only) |
| DELETE | `/subjects/:subjectId` | Cascade-deletes units/chapters/topics/lessons underneath |
| POST | `/subjects/:subjectId/units` | `{ name }` |
| PATCH | `/units/:unitId` | `{ name? }` |
| DELETE | `/units/:unitId` | Cascade-deletes chapters/topics/lessons underneath |
| POST | `/units/:unitId/chapters` | `{ name }` |
| PATCH | `/chapters/:chapterId` | `{ name? }` |
| DELETE | `/chapters/:chapterId` | Cascade-deletes topics/lessons underneath |
| POST | `/chapters/:chapterId/topics` | `{ name, important? }` |
| PATCH | `/topics/:topicId` | `{ name?, important? }` |
| DELETE | `/topics/:topicId` | Cascade-deletes lessons underneath |
| POST | `/topics/:topicId/lessons` | `{ title, content?, objectives?[] }` |
| PATCH | `/lessons/:id` | `{ title?, content?, objectives?[], order? }` |
| DELETE | `/lessons/:id` | Removes lesson + its completion rows |
| GET | `/lessons/:id` | Lesson + breadcrumbs + prev/next + personal note |
| POST | `/lessons/:id/complete` | Idempotent; returns updated course % |
| DELETE | `/lessons/:id/complete` | Unmark |
| PUT | `/lessons/:lessonId/note` | `{ content }` personal note (upsert) |
| POST | `/study-sessions` | `{ lessonId?, minutes 1..480 }` |

## Progress — `/api/progress` (auth required)

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/` | Overall %, per-course trees, streak, study minutes |
| GET | `/dashboard` | Aggregated dashboard: continue learning, activity, quiz/test stats, recommendations |

## Syllabus — `/api/syllabus` (auth required, AI)

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/upload` | multipart field `syllabus` (PDF/DOCX/TXT ≤5MB) | Extracts text, AI structures it, returns **proposal only** |
| POST | `/confirm` | `{ courseName, description?, subjects[] }` | Persists the reviewed structure as the student's course |

## Notes — `/api/notes` (auth required, AI for generation)

| Method | Path | Body |
| --- | --- | --- |
| POST | `/generate` | `{ targetType: SUBJECT|UNIT|CHAPTER|TOPIC|LESSON, targetId, style?: STANDARD|HANDWRITTEN }` |
| GET | `/` · GET `/:id` · DELETE `/:id` | Manage stored notes |

## Doubts — `/api/doubts` (auth required, AI for answers)

| Method | Path | Body |
| --- | --- | --- |
| GET | `/conversations` · GET/DELETE `/conversations/:id` | History |
| POST | `/ask` | `{ question, conversationId?, context? }` → `{ conversationId, message }` |

## Quizzes & tests — `/api/quizzes` (auth required)

| Method | Path | Body / Notes |
| --- | --- | --- |
| POST | `/generate` | `{ subject, scope?, difficulty, count, type?: MOCK_TEST, timeLimitMin? }` (AI) |
| GET | `/?type=QUIZ|MOCK_TEST` | List own quizzes |
| GET | `/:id` | Questions **without answers** |
| DELETE | `/:id` | Own only |
| POST | `/:quizId/attempts` | Start — resumes an in-progress attempt |
| POST | `/attempts/:id/answers` | `{ answers[] }` auto-save (refresh-safe) |
| POST | `/attempts/:id/submit` | `{ answers?[], timeTakenSec? }` → server-graded result |
| GET | `/attempts?type=` | Completed attempts |
| GET | `/attempts/:id/review` | Full questions + correct answers + explanations (only after submit) |

## PYQs — `/api/pyqs` (auth required)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/?subject=&year=&exam=&topic=&difficulty=&q=&page=&limit=` | Paginated |
| GET | `/bookmarks` | Bookmarked questions |
| POST | `/:id/attempt` | `{ answer, correct }` self-check; returns solution |
| GET | `/:id/solution` | Unlocked after attempt |
| POST | `/:id/bookmark` | Toggle |
| POST | `/:id/explain` | AI explanation |

## Performance — `/api/performance`

GET `/` → `{ hasData, summary, subjectStats, strongTopics, weakTopics, recent, timeline }`.
When there are no attempts: `hasData:false` + explicit message (frontend shows empty state).

## Study plans — `/api/study-plans` (auth required)

| Method | Path | Body |
| --- | --- | --- |
| POST | `/generate` | `{ dailyMinutes 15..600, targetDate, preferredDays[], courseId? }` |
| GET | `/active` · GET `/` | Current / all plans |
| POST | `/tasks/:taskId/toggle` | Check/uncheck (auto-completes plan) |
| POST | `/:id/abandon` | Archive plan |

## Interviews — `/api/interviews` (auth required, AI)

| Method | Path | Body |
| --- | --- | --- |
| POST | `/start` | `{ role, domain, difficulty, rounds 3..10 }` → first question |
| POST | `/:sessionId/answer` | `{ exchangeId, answer }` → evaluation + next question, or `{ finished, summary }` |
| GET | `/` · GET `/:id` | Sessions / full transcript |

## Admin — `/api/admin` (auth required **and** `role: ADMIN`; roster & settings need `SUPER_ADMIN`)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/settings` *(SUPER_ADMIN)* | API configuration view. **Keys are never returned in full** — only `set` + a masked preview. |
| PUT | `/settings` *(SUPER_ADMIN)* | Save AI provider/model/keys. Body: `{ provider, model?, keys?{openai,gemini,groq}, removeKeys?[] }`. Keys encrypted at rest. |
| GET | `/admins` *(SUPER_ADMIN)* | Admin roster: every ADMIN/SUPER_ADMIN with role + status. |
| POST | `/admins/invite` *(SUPER_ADMIN)* | `{ name, email }` → INVITED account + 7-day one-time code (emailed when SMTP set; `devInviteCode` exposed only in dev without SMTP). |
| POST | `/admins/:id/approve` *(SUPER_ADMIN)* | PENDING → ACTIVE (invitee set a password, now approved). |
| POST | `/admins/:id/reject` *(SUPER_ADMIN)* | Cancels an INVITED/PENDING account (deleted). |
| POST | `/admins/:id/revoke` *(SUPER_ADMIN)* | ACTIVE → SUSPENDED (login + live sessions blocked immediately). |
| POST | `/admins/:id/restore` *(SUPER_ADMIN)* | SUSPENDED → ACTIVE. |
| DELETE | `/admins/:id` *(SUPER_ADMIN)* | Permanent delete. Targets must be role ADMIN; SUPER_ADMINs and self are protected. |
| GET | `/stats` | Live counts: students, activity, courses, attempts… |
| GET | `/students?q=&status=&page=&limit=` | Search/filter/paginate |
| GET | `/students/:id` | Profile + courses + attempts + study time |
| POST | `/students/:id/suspend` · `/restore` | Blocks login + existing sessions immediately |
| DELETE | `/students/:id` | Cascading delete; students only, never self |

## Contact — `/api/contact`

POST `/` `{ name, email, message }` — delivered via SMTP when configured; honest response otherwise.

## Errors of note

| Status | When |
| --- | --- |
| 400 | Validation failures, expired/wrong OTP |
| 401 | Missing/invalid session, bad credentials |
| 403 | Wrong role, suspended account, foreign resource |
| 404 | Unknown routes/resources |
| 409 | Duplicate email |
| 429 | Rate limits |
| 503 `AI_NOT_CONFIGURED` | AI endpoint used with no active provider/key (set one via Admin Panel → Settings → API Configuration, or `AI_PROVIDER`/`AI_API_KEY` env vars) |
