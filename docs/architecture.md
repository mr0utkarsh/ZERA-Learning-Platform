# ZERA architecture plan

## Product direction

ZERA is a student-first learning platform focused on personalization, progress tracking, and AI-assisted learning. The frontend is a GitHub Pages-compatible static website with demo logic powered by localStorage.

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

## Demo-mode policy

The frontend in this repository intentionally does not claim real production AI or secured backend behavior. All dynamic functionality is a frontend demo and must be clearly labeled as Demo Mode when a real provider is not connected.

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
