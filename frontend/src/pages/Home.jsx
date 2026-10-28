import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const JOURNEY = [
  { icon: '01', emoji: '📤', title: 'Syllabus upload & AI analysis', body: 'Turn a syllabus into a reviewable course structure.', to: '/courses' },
  { icon: '02', emoji: '📚', title: 'Notes & study material', body: 'Build a dependable home for each subject and lesson.', to: '/courses' },
  { icon: '03', emoji: '✍️', title: 'AI handwritten notes', body: 'Create readable study sheets from your learning notes.', to: '/notes' },
  { icon: '04', emoji: '🗂️', title: 'PYQs & important questions', body: 'Practice previous-year questions and revisit tricky topics.', to: '/pyqs' },
  { icon: '05', emoji: '💬', title: 'AI doubt solver', body: 'Work through concepts with step-by-step explanations.', to: '/doubts' },
  { icon: '06', emoji: '⚡', title: 'AI quiz generator', body: 'Check recall with focused, syllabus-linked quizzes.', to: '/quiz' },
  { icon: '07', emoji: '📊', title: 'Performance analysis', body: 'See strengths and gaps based on your real attempts.', to: '/performance' },
  { icon: '08', emoji: '🗓️', title: 'Personalized study plan', body: 'Turn your target date into a practical daily schedule.', to: '/study-plan' },
  { icon: '09', emoji: '✅', title: 'Syllabus progress tracking', body: 'Know what is done, what is next, and what remains.', to: '/progress' },
  { icon: '10', emoji: '🎤', title: 'AI mock interview', body: 'Practice role-based questions and get answer feedback.', to: '/interview' },
  { icon: '11', emoji: '🚀', title: 'Skills & project resources', body: 'Find external courses, documentation and project practice.', to: '/resources' },
];

const AUDIENCES = [
  { emoji: '🎓', title: 'For university students', body: 'Organize semester syllabi, revise with questions, and make steady progress before exams.' },
  { emoji: '💼', title: 'For job seekers', body: 'Strengthen technical skills, build projects, prepare for interviews, and keep a plan.' },
  { emoji: '🔥', title: 'For everyday momentum', body: 'A real study streak rewards consistency, while your progress stays tied to work you actually complete.' },
];

export default function Home() {
  const { user } = useAuth();
  const ctaTarget = user ? (user.role === 'ADMIN' ? '/admin' : '/dashboard') : '/signup';

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> Your learning, all connected</span>
            <h1>Make your next chapter <span>your best one.</span></h1>
            <p className="home-lead">A focused learning platform for university students and job seekers. Bring your syllabus, build skills, practice for what matters, and keep showing up — one day at a time.</p>
            <div className="hero-cta">
              <Link className="btn btn-primary btn-lg" to={ctaTarget}>Start your learning journey <span aria-hidden="true">→</span></Link>
              <Link className="home-secondary-link" to="/features">Explore all features <span aria-hidden="true">↗</span></Link>
            </div>
            <div className="hero-trust"><span>🎓</span> University learning <i /> <span>💼</span> Career readiness <i /> <span>🔥</span> Daily consistency</div>
          </div>
          <div className="hero-art" aria-label="Illustration of a connected study journey">
            <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
            <div className="hero-note-card"><div className="mini-card-head"><span className="mini-app-icon">Z</span><span>YOUR STUDY SPACE</span><span className="live-dot" /></div><div className="mini-welcome">One step at a time<span>✦</span></div><div className="mini-path"><span className="mini-path-icon">📚</span><span><b>Learn with a plan</b><small>Make room for focused progress</small></span><span className="mini-chevron">↗</span></div><div className="mini-path"><span className="mini-path-icon green">✓</span><span><b>Practice what you learn</b><small>Turn understanding into confidence</small></span><span className="mini-chevron">↗</span></div><div className="mini-habit"><div><span className="mini-fire">🔥</span><b>Keep your daily rhythm</b></div><div className="mini-days"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div></div></div>
            <div className="floating-chip chip-top"><span>✦</span> AI study tools</div><div className="floating-chip chip-bottom"><span>↗</span> Your next step, clear</div>
          </div>
        </div>
        <div className="hero-bottom-line"><span>LESS SCATTER. MORE MOMENTUM.</span><span>LEARN · PRACTICE · GROW</span></div>
      </section>

      <section className="home-section journey-section" id="journey">
        <div className="section-heading">
          <span className="eyebrow">One connected workflow</span>
          <h2>From syllabus to next opportunity.</h2>
          <p>Start with what you need to learn. ZERA brings the next useful step into reach — from exam prep to career practice.</p>
        </div>
        <div className="journey-list">
          {JOURNEY.map((step) => <Link to={user ? (step.to === '/resources' ? '/learning/resources' : step.to) : '/signup'} className="journey-item" key={step.icon}>
            <span className="journey-number">{step.icon}</span><span className="journey-emoji">{step.emoji}</span><span className="journey-copy"><b>{step.title}</b><small>{step.body}</small></span><span className="journey-arrow" aria-hidden="true">↗</span>
          </Link>)}
        </div>
        <p className="journey-footnote">AI features depend on server configuration. Syllabus structures are reviewable before saving, and learning metrics come from your actual activity.</p>
      </section>

      <section className="home-audience">
        <div className="home-section audience-inner">
          <div className="section-heading align-left"><span className="eyebrow">Made for what comes next</span><h2>Study for today.<br />Build toward tomorrow.</h2><p>Whether finals are around the corner or you’re preparing for your first role, build a learning routine that fits your goals.</p><Link className="btn btn-dark" to={user ? '/dashboard' : '/signup'}>Build your routine <span aria-hidden="true">→</span></Link></div>
          <div className="audience-cards">{AUDIENCES.map((item) => <article className="audience-card" key={item.title}><span>{item.emoji}</span><div><h3>{item.title}</h3><p>{item.body}</p></div><span className="audience-spark">✳</span></article>)}</div>
        </div>
      </section>

      <section className="home-section resources-promo">
        <div className="resource-promo-icon">↗</div><div><span className="eyebrow">Beyond the classroom</span><h2>Find your next skill to build.</h2><p>Explore learning sites, technical documentation, coding practice and project ideas curated for students and early-career learners.</p></div><Link className="btn btn-outline" to="/resources">Browse resources <span aria-hidden="true">→</span></Link>
      </section>

      <section className="home-cta"><div><span className="eyebrow">A little progress adds up</span><h2>Make today count.</h2><p>Set up your learning space and take the first small step toward your goal.</p><Link className="btn btn-light btn-lg" to={ctaTarget}>Get started for free <span aria-hidden="true">→</span></Link></div><div className="cta-mark" aria-hidden="true">Z<span>✦</span></div></section>
    </div>
  );
}
