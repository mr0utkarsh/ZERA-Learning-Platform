import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { emoji: '🗂️', title: 'Structured syllabus', body: 'Course → Subject → Unit → Chapter → Topic → Lesson. Upload your syllabus and get a clean structure you can track.' },
  { emoji: '🤖', title: 'AI notes generator', body: 'Generate exam-focused notes for any subject, unit, chapter, topic or lesson — with key points and summaries.' },
  { emoji: '✍️', title: 'Handwritten-style notes', body: 'Readable handwritten-style study sheets you can preview, save and download.' },
  { emoji: '💬', title: 'AI doubt solver', body: 'Ask anything, get step-by-step explanations with examples, and continue the conversation with follow-ups.' },
  { emoji: '❓', title: 'Quizzes & mock tests', body: 'Generate MCQ, true/false and short-answer quizzes with timers, automatic grading and full reviews.' },
  { emoji: '🗓️', title: 'Personalized study plans', body: 'Daily study time + target exam date + your weak areas = a realistic day-by-day schedule.' },
  { emoji: '📊', title: 'Real performance analysis', body: 'Accuracy, subject-wise stats, strong/weak areas and trends — computed from your actual attempts.' },
  { emoji: '🎤', title: 'AI mock interviews', body: 'Practice role-based interviews, get scored feedback on every answer and a final evaluation.' },
];

const STEPS = [
  { title: 'Create your account', body: 'Sign up in seconds and verify your email with a one-time code.' },
  { title: 'Add your syllabus', body: 'Upload a PDF/DOCX/TXT syllabus or build your course structure manually.' },
  { title: 'Study with AI support', body: 'Read lessons, generate notes, and clear doubts with the AI tutor.' },
  { title: 'Practice & track', body: 'Take quizzes and mock tests, follow your study plan and watch progress grow.' },
];

const FAQS = [
  { q: 'Is ZERA free to use?', a: 'Creating an account and using the learning platform is free in this deployment. Some AI-powered features require the server to be configured with an AI provider; when it is not configured, those features clearly say so instead of pretending to work.' },
  { q: 'Do I need to upload my syllabus?', a: 'No. You can also create courses manually — course, subjects, units, chapters, topics and lessons. Uploading a syllabus just lets the AI propose a structure for you to review and save.' },
  { q: 'How is my progress calculated?', a: 'Progress is calculated only from lessons you actually mark complete, plus your real quiz and test results. Nothing is estimated or faked.' },
  { q: 'Who can see my data?', a: 'Your learning data belongs to you. Administrators can see account-level statistics for moderation, but your answers and notes stay tied to your account.' },
  { q: 'Does ZERA have a teacher module?', a: 'No — ZERA is intentionally student-focused. Everything is built around one learner’s journey.' },
];

export default function Home() {
  const { user } = useAuth();
  const ctaTarget = user ? (user.role === 'ADMIN' ? '/admin' : '/dashboard') : '/signup';

  return (
    <div>
      <section className="hero">
        <span className="tagline">AI-powered personalized learning</span>
        <h1>ZERA — Your <span className="grad">New Era</span> of Learning</h1>
        <p className="lead">
          One place for your entire study journey: structured courses, AI-generated notes,
          an always-available tutor, quizzes, mock tests, previous-year questions,
          progress tracking and personalized study plans.
        </p>
        <div className="hero-cta">
          <Link className="btn btn-primary btn-lg" to={ctaTarget}>Start Learning</Link>
          <Link className="btn btn-outline btn-lg" to="/features">Explore Features</Link>
        </div>
      </section>

      <section className="section" id="why">
        <h2>Why ZERA?</h2>
        <p className="sub">
          Studying is scattered — PDFs, videos, notes, doubts left unanswered.
          ZERA brings structure, guidance and measurement into one calm workspace.
        </p>
        <div className="grid grid-3">
          <div className="feature-card"><span className="emoji">🧭</span><h3>Clarity</h3><p>See your whole syllabus as a tree with real completion percentages at every level — never wonder “what’s left?” again.</p></div>
          <div className="feature-card"><span className="emoji">⚡</span><h3>Speed</h3><p>Notes, quizzes and study plans generated around your actual syllabus structure, not generic content.</p></div>
          <div className="feature-card"><span className="emoji">🎯</span><h3>Honest tracking</h3><p>Every metric comes from what you actually completed and attempted. Empty charts say “not enough data yet” — they never invent numbers.</p></div>
        </div>
      </section>

      <section className="section">
        <h2>Everything a student needs</h2>
        <p className="sub">From your first lesson to your final mock interview.</p>
        <div className="grid grid-4">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <span className="emoji">{f.emoji}</span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>How it works</h2>
        <p className="sub">Four steps from signup to steady progress.</p>
        <div className="steps">
          {STEPS.map((s) => (
            <div className="step" key={s.title}><h4>{s.title}</h4><p>{s.body}</p></div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>AI that stays in its lane</h2>
        <p className="sub">
          ZERA’s AI features run through a secure backend: your documents are parsed,
          responses are validated before they’re stored, and if the AI service isn’t
          configured, ZERA tells you plainly instead of making things up.
        </p>
        <div className="grid grid-3">
          <div className="feature-card"><span className="emoji">🔒</span><h3>Private by design</h3><p>API keys live on the server. Your browser never sees them.</p></div>
          <div className="feature-card"><span className="emoji">✅</span><h3>Validated output</h3><p>AI structures and questions are checked and cleaned before you ever see them.</p></div>
          <div className="feature-card"><span className="emoji">🪞</span><h3>No fake numbers</h3><p>No invented testimonials, user counts or progress — what you see is your real data.</p></div>
        </div>
      </section>

      <section className="section">
        <h2>Frequently asked questions</h2>
        <p className="sub">The short, honest answers.</p>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {FAQS.map((f) => (
            <details className="faq-item" key={f.q}>
              <summary>{f.q}</summary>
              <div className="faq-body">{f.a}</div>
            </details>
          ))}
        </div>
      </section>

      <section className="section" style={{ textAlign: 'center' }}>
        <div className="card" style={{ padding: '44px 28px', background: 'linear-gradient(135deg, #f4f2ff, #e9fbf5)' }}>
          <h2 style={{ marginBottom: 8 }}>Ready for your new era of learning?</h2>
          <p className="muted" style={{ maxWidth: 460, margin: '0 auto 22px' }}>
            Create your free account, bring your syllabus, and let ZERA structure the way you study.
          </p>
          <Link className="btn btn-primary btn-lg" to={ctaTarget}>Start Learning</Link>
        </div>
      </section>
    </div>
  );
}
