# ZERA – AI-Powered Personalized Learning Platform

ZERA is a free, student-first learning platform designed to help learners organize their syllabus, track progress, generate notes, solve doubts, take quizzes, prepare for interviews, and build a stronger study routine.

This repository is a GitHub Pages-friendly frontend with localStorage-based demo functionality. It is designed to scale toward a future backend architecture with authentication, database access, and AI provider integration.

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
- AI tools hub with Demo Mode labels
- Dashboard with course progress and next-step guidance
- Syllabus tracking with states for not started, active, and complete
- Quiz and mock test demos with localStorage persistence
- Study plan generation and task tracking
- AI mock interview demo
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

## Local development

Because this is a GitHub Pages-ready static frontend, no install step is required.

Open the project folder and launch a local server:

```bash
cd "ZERA-Learning-Platform"
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

## GitHub Pages deployment

The project is designed for GitHub Pages with root-relative and relative asset usage, such as:

```html
<link rel="stylesheet" href="./css/style.css">
<script src="./js/app.js" defer></script>
```

No localhost, absolute filesystem, or backend-only dependency is required for the frontend to render.

## Demo-mode limitations

This project intentionally does not claim real AI or backend integration.

- AI tools operate in Demo Mode
- localStorage stores frontend demo state only
- passwords, OTPs, API keys, and secrets are never stored in the repository

## Future backend architecture

The project is structured to evolve toward:

Frontend -> Backend API -> PostgreSQL + Prisma -> AI provider

Suggested future services include:

- Google Gemini
- Resend or Brevo for email
- PostgreSQL for transactional data
- Prisma for schema management

## Security notes

- Do not store real passwords, OTP values, API keys, or secrets in localStorage
- Use environment variables in a future backend
- Use secure session/auth handling in the production backend
- Validate and sanitize all user input before persistence

## Creator

Created by Utkarsh Giri

Contact: 9235542673

## License

This project is licensed under the MIT License. See [LICENSE.txt](LICENSE.txt).
