import React from 'react';
import { Link } from 'react-router-dom';
import { Brand } from '../../layouts/PublicLayout';

export function AuthShell({ children, mode = 'login' }) {
  const isSignup = mode === 'signup';
  return (
    <main className={`auth-screen auth-screen-${mode}`}>
      <section className="auth-aside" aria-label="About ZERA">
        <div className="auth-aside-glow auth-glow-one" />
        <div className="auth-aside-glow auth-glow-two" />
        <div className="auth-aside-inner">
          <Brand />
          <div className="auth-aside-copy">
            <span className="auth-kicker"><span /> BUILT FOR YOUR NEXT CHAPTER</span>
            <h2>{isSignup ? <>Make room for<br /><em>what’s next.</em></> : <>You’re closer<br />than <em>you think.</em></>}</h2>
            <p>{isSignup ? 'Bring your goals. We’ll help you turn them into a learning routine you can actually stick with.' : 'Pick up where you left off and keep building the skills, knowledge and confidence you came here for.'}</p>
            <div className="auth-benefits">
              <div><span className="auth-benefit-icon">✦</span><span><b>Your syllabus, organized</b><small>One calm place for your study journey</small></span></div>
              <div><span className="auth-benefit-icon auth-benefit-green">↗</span><span><b>Practice with purpose</b><small>Quizzes, questions and interview prep</small></span></div>
              <div><span className="auth-benefit-icon auth-benefit-gold">◷</span><span><b>Progress that feels real</b><small>Build momentum, one day at a time</small></span></div>
            </div>
          </div>
          <div className="auth-aside-footer"><span>LEARN WITH CLARITY</span><span>GROW WITH CONFIDENCE</span></div>
          <div className="auth-orbit auth-orbit-a" /><div className="auth-orbit auth-orbit-b" />
          <div className="auth-floating auth-float-top"><span>✦</span> Your next step, made clear</div>
          <div className="auth-floating auth-float-bottom"><span>🔥</span> Small steps add up</div>
        </div>
      </section>
      <section className="auth-form-stage">
        <Link className="auth-back-home" to="/">← <span>Back to ZERA</span></Link>
        <div className="auth-form-card">{children}</div>
        <p className="auth-secure-note"><span aria-hidden="true">♢</span> Your learning account is private and secure.</p>
      </section>
    </main>
  );
}

export function AuthDivider() {
  return <div className="auth-divider"><span />or continue with email<span /></div>;
}
