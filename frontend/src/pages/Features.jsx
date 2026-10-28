import React from 'react';
import { Link } from 'react-router-dom';

const JOURNEY = [
  ['📤', 'Syllabus Upload & AI Analysis', 'Upload a PDF, DOCX or TXT syllabus. Review the AI-proposed course structure before saving it.', '/courses', '01 · Start here'],
  ['📚', 'Notes & Study Material', 'Keep your course hierarchy, lesson content, objectives and personal study notes in one place.', '/courses', '02 · Organize'],
  ['✍️', 'AI Handwritten Notes', 'Generate study notes and turn saved notes into a readable handwritten-style study sheet.', '/notes', '03 · Create'],
  ['🗂️', 'PYQs & Important Questions', 'Filter previous-year questions by subject, year, exam, topic and difficulty; bookmark and practice them.', '/pyqs', '04 · Revise'],
  ['💬', 'AI Doubt Solver', 'Ask follow-up questions and work through explanations step by step with an AI tutor.', '/doubts', '05 · Understand'],
  ['⚡', 'AI Quiz Generator', 'Build focused quizzes from your syllabus and review your answers after each attempt.', '/quiz', '06 · Practice'],
  ['📊', 'Performance Analysis', 'Review quiz accuracy, subject performance and stronger or weaker areas from your actual attempts.', '/performance', '07 · Reflect'],
  ['🗓️', 'Personalized Study Plan', 'Set a daily time budget and target date, then follow a persistent schedule based on your syllabus.', '/study-plan', '08 · Plan'],
  ['✅', 'Syllabus Progress Tracking', 'Track completed lessons from topic to course level, with progress based on real completions.', '/progress', '09 · Track'],
  ['🎤', 'AI Mock Interview', 'Practice role- and domain-based interview questions and receive feedback on your answers.', '/interview', '10 · Prepare'],
  ['🚀', 'Skills & Project Resources', 'Explore external learning platforms, documentation, coding practice and career-learning resources.', '/resources', '11 · Grow'],
];

export default function Features() {
  return (
    <div className="features-page">
      <section className="features-hero"><span className="eyebrow">A learning journey, in order</span><h1>Everything you need to <span>learn forward.</span></h1><p>Start with your syllabus, build understanding, practice with purpose and carry your skills into the next opportunity.</p><Link className="btn btn-primary btn-lg" to="/signup">Start learning <span aria-hidden="true">→</span></Link></section>
      <section className="page features-flow">
        <div className="features-flow-head"><div><span className="eyebrow">Your study workflow</span><h2>Eleven steps. One learning space.</h2></div><p>Use the tools that fit your goal. Your course structure, study plan and progress stay connected.</p></div>
        <div className="feature-flow-list">{JOURNEY.map(([emoji, title, body, to, label]) => <article className="feature-flow-card" key={title}><div className="feature-flow-number">{label}</div><div className="feature-flow-icon">{emoji}</div><div className="feature-flow-copy"><h3>{title}</h3><p>{body}</p></div><Link to={to} aria-label={`Explore ${title}`} className="feature-flow-link">↗</Link></article>)}</div>
        <div className="features-honesty"><span>🔒</span><p><b>Built to be useful and honest.</b> AI features require an AI provider configured on the server. Uploaded syllabus structures can be reviewed before saving, and progress and analytics are calculated from actual learning activity.</p></div>
      </section>
    </div>
  );
}
