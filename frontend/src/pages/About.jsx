import React from 'react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="section" style={{ maxWidth: 800 }}>
      <h2>About ZERA</h2>
      <p className="sub" style={{ textAlign: 'left' }}>
        ZERA exists for one reason: to give every student a structured, supported and honest way to learn.
      </p>

      <div className="card mb-12">
        <h3>Our mission</h3>
        <p className="muted mb-0">
          Most students don’t struggle because they lack effort — they struggle because their study
          material is scattered, their doubts pile up unanswered, and they can’t see how far they’ve
          actually come. ZERA puts the syllabus, the guidance, the practice and the measurement in one
          place, so effort turns into visible progress.
        </p>
      </div>

      <div className="card mb-12">
        <h3>What we believe</h3>
        <ul className="muted" style={{ margin: 0, paddingLeft: 20 }}>
          <li><b>Students first.</b> ZERA has no teacher module — every screen is built for the learner.</li>
          <li><b>Honest data.</b> Progress, scores and analytics always reflect real activity. We never pad dashboards with fake numbers.</li>
          <li><b>AI as a tutor, not an oracle.</b> AI output is validated and reviewed; when AI isn’t available, we say so clearly.</li>
          <li><b>Privacy by default.</b> Your work is yours; secrets stay server-side.</li>
        </ul>
      </div>

      <div className="card">
        <h3>The platform</h3>
        <p className="muted mb-0">
          ZERA covers the full learning loop: structure your syllabus (upload or manual), study lessons,
          generate notes (standard and handwritten-style), clear doubts with an AI tutor, practice with
          quizzes, mock tests and previous-year questions, follow a personalized study plan, analyze your
          performance, and rehearse for interviews with AI mock interviews.
        </p>
      </div>

      <div style={{ textAlign: 'center', marginTop: 30 }}>
        <Link className="btn btn-primary" to="/signup">Create your account</Link>
      </div>
    </div>
  );
}
