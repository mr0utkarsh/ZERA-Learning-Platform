import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

export default function Landing() {
  return (
    <div className="zera-home">
      <header className="site-header zera-header">
        <div className="container header-inner">
          <Link to="/" className="zera-logo" aria-label="ZERA home">
            <Logo />
          </Link>
          <nav className="nav zera-nav" aria-label="Main navigation">
            <a href="#experience">Experience</a>
            <a href="#journey">Journey</a>
            <a href="#tools">Tools</a>
            <a href="/resources">Resources</a>
          </nav>
          <div className="header-actions">
            <Link className="zera-login" to="/login">Log in</Link>
            <Link className="btn zera-cta-small" to="/signup">Join ZERA <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </header>
      <main>
        <section className="zera-hero" aria-labelledby="hero-title">
          <div className="zera-orbit zera-orbit-one" aria-hidden="true"></div>
          <div className="zera-orbit zera-orbit-two" aria-hidden="true"></div>
          <div className="container zera-hero-grid">
            <div className="zera-hero-copy">
              <p className="zera-kicker"><span></span> A more intentional way to learn</p>
              <h1 id="hero-title">MAKE<br />LEARNING<br /><em>YOURS.</em></h1>
              <p className="zera-intro">One place to shape your syllabus, build a study rhythm, test your understanding, and keep moving forward.</p>
              <div className="zera-hero-actions">
                <Link className="btn zera-cta" to="/signup">Begin your journey <span aria-hidden="true">↗</span></Link>
                <a className="zera-text-link" href="#experience">Discover ZERA <span aria-hidden="true">↓</span></a>
              </div>
            </div>
            <div className="zera-hero-art" aria-label="Abstract illustration of focused learning">
              <div className="zera-grid-field" aria-hidden="true"></div>
              <div className="zera-portal" aria-hidden="true"><div className="zera-portal-core">Z</div></div>
              <div className="zera-signal signal-one" aria-hidden="true"></div>
              <div className="zera-signal signal-two" aria-hidden="true"></div>
              <div className="zera-art-label top">PERSONALISED LEARNING</div>
              <div className="zera-art-label bottom">ZERA / 01</div>
              <div className="zera-art-card">
                <small>YOUR LEARNING SPACE</small>
                <strong>Focused.<br />Connected.<br />Yours.</strong>
                <span>EXPLORE THE PATH&nbsp; ↗</span>
              </div>
            </div>
          </div>
          <div className="zera-ticker" aria-hidden="true">
            <div>CLARITY&nbsp; • &nbsp;PRACTICE&nbsp; • &nbsp;MOMENTUM&nbsp; • &nbsp;CLARITY&nbsp; • &nbsp;PRACTICE&nbsp; • &nbsp;MOMENTUM&nbsp; • &nbsp;</div>
          </div>
        </section>
        <section className="zera-manifesto" id="experience">
          <div className="container">
            <p className="zera-section-label">01 — THE ZERA EXPERIENCE</p>
            <div className="zera-manifesto-grid">
              <h2>Less noise.<br /><span>More progress.</span></h2>
              <div>
                <p className="zera-lead">ZERA brings the work that matters into a clear, connected learning space—without pretending every learner has the same starting line.</p>
                <a href="/about" className="zera-arrow-link">Why we built ZERA <span aria-hidden="true">↗</span></a>
              </div>
            </div>
            <div className="zera-values">
              <article>
                <span>01</span>
                <h3>Start with clarity</h3>
                <p>Turn a broad syllabus into the next useful thing to understand.</p>
              </article>
              <article>
                <span>02</span>
                <h3>Practise with purpose</h3>
                <p>Use quizzes, mock tests, notes and revision tools around your own goals.</p>
              </article>
              <article>
                <span>03</span>
                <h3>Keep your momentum</h3>
                <p>Make progress visible so a difficult week never becomes a lost month.</p>
              </article>
            </div>
          </div>
        </section>
        <section className="zera-showcase" id="journey">
          <div className="container zera-showcase-grid">
            <div className="zera-showcase-copy">
              <p className="zera-section-label">02 — DESIGNED FOR THE WHOLE JOURNEY</p>
              <h2>From<br />"where do I start?"<br /><em>to "what's next?"</em></h2>
              <p>Plan your study time, work through concepts, and review what needs attention. ZERA keeps each step close to the next.</p>
              <Link className="btn zera-cta zera-cta-dark" to="/onboarding">Set up your learning space <span aria-hidden="true">↗</span></Link>
            </div>
            <div className="zera-path-panel" aria-label="ZERA learning journey">
              <div className="zera-path-head">
                <span>YOUR LEARNING LOOP</span>
                <span>ALWAYS IN MOTION</span>
              </div>
              <ol>
                <li>
                  <b>01</b>
                  <div>
                    <strong>Shape your syllabus</strong>
                    <span>Organise subjects, units and priorities.</span>
                  </div>
                  <i aria-hidden="true">→</i>
                </li>
                <li>
                  <b>02</b>
                  <div>
                    <strong>Learn in your rhythm</strong>
                    <span>Study plans and AI support when you need them.</span>
                  </div>
                  <i aria-hidden="true">→</i>
                </li>
                <li>
                  <b>03</b>
                  <div>
                    <strong>Test what you know</strong>
                    <span>Quizzes and mock tests turn review into action.</span>
                  </div>
                  <i aria-hidden="true">→</i>
                </li>
                <li>
                  <b>04</b>
                  <div>
                    <strong>Reflect and continue</strong>
                    <span>Use real activity to choose your next session.</span>
                  </div>
                  <i aria-hidden="true">→</i>
                </li>
              </ol>
            </div>
          </div>
        </section>
        <section className="zera-tools" id="tools">
          <div className="container">
            <div className="zera-tools-heading">
              <p className="zera-section-label">03 — THE TOOLKIT</p>
              <h2>Tools that<br /><em>earn their place.</em></h2>
            </div>
            <div className="zera-tool-grid">
              <Link to="/syllabus" className="zera-tool zera-tool-large">
                <span className="zera-tool-index">01</span>
                <div className="zera-tool-symbol">↗</div>
                <h3>Syllabus<br />workspace</h3>
                <p>Bring the shape of your course into focus.</p>
                <span className="zera-tool-link">Explore <b>→</b></span>
              </Link>
              <Link to="/ai-tools" className="zera-tool zera-tool-blue">
                <span className="zera-tool-index">02</span>
                <div className="zera-tool-symbol">✦</div>
                <h3>AI study<br />support</h3>
                <p>Ask, explore and break down difficult ideas.</p>
                <span className="zera-tool-link">Explore <b>→</b></span>
              </Link>
              <Link to="/quiz" className="zera-tool zera-tool-light">
                <span className="zera-tool-index">03</span>
                <div className="zera-tool-symbol">?</div>
                <h3>Practice<br />room</h3>
                <p>Meet your knowledge with meaningful questions.</p>
                <span className="zera-tool-link">Explore <b>→</b></span>
              </Link>
              <Link to="/dashboard" className="zera-tool zera-tool-orange">
                <span className="zera-tool-index">04</span>
                <div className="zera-tool-symbol">↗</div>
                <h3>Progress<br />dashboard</h3>
                <p>See what you have done and where to go next.</p>
                <span className="zera-tool-link">Explore <b>→</b></span>
              </Link>
            </div>
          </div>
        </section>
        <section className="zera-final">
          <div className="container">
            <p className="zera-section-label">YOUR NEW ERA STARTS HERE</p>
            <h2>STUDY WITH<br /><em>DIRECTION.</em></h2>
            <Link className="btn zera-cta" to="/signup">Create your account <span aria-hidden="true">↗</span></Link>
          </div>
        </section>
      </main>
      <footer className="zera-footer">
        <div className="container zera-footer-top">
          <Link to="/" className="zera-logo">
            <Logo />
          </Link>
          <p>Your new era of learning.</p>
          <a href="/contact">Get in touch <span aria-hidden="true">↗</span></a>
        </div>
        <div className="container zera-footer-bottom">
          <small>© 2026 ZERA</small>
          <div>
            <a href="/support">Support</a>
            <Link to="/login">Log in</Link>
            <a href="/admin-login">Admin</a>
          </div>
        </div>
      </footer>
    </div>
  );
}