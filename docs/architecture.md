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

Gemini-powered features require `GEMINI_API_KEY`. Password reset and OTP delivery require `EMAIL_PROVIDER=smtp`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS`, and `EMAIL_FROM`. Missing provider configuration is returned as an explicit error; the backend does not fabricate responses.

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
