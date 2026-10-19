import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { useRef } from 'react';
import { Logo } from '../components/Logo';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as any } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 });

  const handleMouse = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const reset = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function MagneticButton({ children, className, to }: { children: React.ReactNode; className?: string; to: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMouse = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left - rect.width / 2) * 0.3);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.3);
  };
  const reset = () => { x.set(0); y.set(0); };

  return (
    <motion.div style={{ x: springX, y: springY }} className="inline-block">
      <Link ref={ref} to={to} className={className} onMouseMove={handleMouse} onMouseLeave={reset}>
        {children}
      </Link>
    </motion.div>
  );
}

export default function Landing() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);


  return (
    <div className="zera-home overflow-x-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-transparent blur-3xl"
          animate={{ x: [0, 100, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full bg-gradient-to-tl from-teal-500/15 via-cyan-500/10 to-transparent blur-3xl"
          animate={{ x: [0, -80, 0], y: [0, -60, 0], scale: [1.1, 1, 1.1] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <header className="site-header zera-header backdrop-blur-xl bg-white/70 sticky top-0 z-50 border-b border-slate-200/50">
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
            <MagneticButton className="btn zera-cta-small" to="/signup">Join ZERA <span aria-hidden="true">↗</span></MagneticButton>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <motion.section
          ref={heroRef}
          style={{ y: heroY, opacity: heroOpacity }}
          className="zera-hero relative min-h-screen flex items-center"
          aria-labelledby="hero-title"
        >
          <div className="container zera-hero-grid">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="zera-hero-copy"
            >
              <motion.p variants={fadeUp} className="zera-kicker"><span></span> A more intentional way to learn</motion.p>
              <motion.h1 variants={fadeUp} id="hero-title" className="text-6xl md:text-8xl font-black tracking-tight">
                MAKE<br />LEARNING<br /><em className="bg-gradient-to-r from-indigo-600 to-teal-500 bg-clip-text text-transparent">YOURS.</em>
              </motion.h1>
              <motion.p variants={fadeUp} className="zera-intro text-lg text-slate-600 max-w-lg">
                One place to shape your syllabus, build a study rhythm, test your understanding, and keep moving forward.
              </motion.p>
              <motion.div variants={fadeUp} className="zera-hero-actions flex gap-4 mt-8">
                <MagneticButton className="btn zera-cta" to="/signup">Begin your journey <span aria-hidden="true">↗</span></MagneticButton>
                <a className="zera-text-link" href="#experience">Discover ZERA <span aria-hidden="true">↓</span></a>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] as any }}
              className="zera-hero-art relative"
            >
              <TiltCard className="zera-art-card bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/50">
                <small className="text-xs font-semibold text-slate-400 tracking-widest">YOUR LEARNING SPACE</small>
                <strong className="block text-2xl font-bold mt-2">Focused.<br />Connected.<br />Yours.</strong>
                <span className="text-sm text-indigo-600 mt-4 block">EXPLORE THE PATH ↗</span>
              </TiltCard>
              <motion.div
                className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 blur-sm opacity-60"
                animate={{ y: [0, -20, 0], rotate: [0, 180, 360] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute -bottom-6 -left-6 w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 blur-sm opacity-50"
                animate={{ y: [0, 15, 0], rotate: [0, -90, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
          </div>
        </motion.section>

        {/* Manifesto Section */}
        <motion.section
          id="experience"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="zera-manifesto py-24"
        >
          <div className="container">
            <motion.p variants={fadeUp} className="zera-section-label">01 — THE ZERA EXPERIENCE</motion.p>
            <div className="zera-manifesto-grid grid md:grid-cols-2 gap-12">
              <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold">Less noise.<br /><span className="text-indigo-600">More progress.</span></motion.h2>
              <motion.div variants={fadeUp}>
                <p className="zera-lead text-lg text-slate-600">ZERA brings the work that matters into a clear, connected learning space—without pretending every learner has the same starting line.</p>
                <a href="/about" className="zera-arrow-link text-indigo-600 font-medium mt-4 inline-block">Why we built ZERA ↗</a>
              </motion.div>
            </div>
            <motion.div variants={stagger} className="zera-values grid md:grid-cols-3 gap-6 mt-16">
              {[
                { num: '01', title: 'Start with clarity', desc: 'Turn a broad syllabus into the next useful thing to understand.' },
                { num: '02', title: 'Practise with purpose', desc: 'Use quizzes, mock tests, notes and revision tools around your own goals.' },
                { num: '03', title: 'Keep your momentum', desc: 'Make progress visible so a difficult week never becomes a lost month.' },
              ].map((v, i) => (
                <TiltCard key={i} className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 cursor-pointer">
                  <motion.article variants={fadeUp}>
                    <span className="text-4xl font-black text-indigo-200">{v.num}</span>
                    <h3 className="text-xl font-bold mt-2">{v.title}</h3>
                    <p className="text-slate-600 mt-2">{v.desc}</p>
                  </motion.article>
                </TiltCard>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* Journey Section */}
        <motion.section
          id="journey"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="zera-showcase py-24 bg-slate-900 text-white"
        >
          <div className="container">
            <motion.p variants={fadeUp} className="zera-section-label text-indigo-400">02 — DESIGNED FOR THE WHOLE JOURNEY</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold mt-4">From<br />"where do I start?"<br /><em className="text-indigo-400">to "what's next?"</em></motion.h2>
            <motion.p variants={fadeUp} className="text-slate-400 mt-4 max-w-lg">Plan your study time, work through concepts, and review what needs attention. ZERA keeps each step close to the next.</motion.p>
            <motion.div variants={fadeUp} className="mt-8">
              <MagneticButton className="btn zera-cta zera-cta-dark bg-white text-slate-900 px-6 py-3 rounded-xl font-semibold" to="/onboarding">Set up your learning space ↗</MagneticButton>
            </motion.div>
            <motion.ol variants={stagger} className="mt-16 space-y-4">
              {[
                { num: '01', title: 'Shape your syllabus', desc: 'Organise subjects, units and priorities.' },
                { num: '02', title: 'Learn in your rhythm', desc: 'Study plans and AI support when you need them.' },
                { num: '03', title: 'Test what you know', desc: 'Quizzes and mock tests turn review into action.' },
                { num: '04', title: 'Reflect and continue', desc: 'Use real activity to choose your next session.' },
              ].map((step, i) => (
                <motion.li
                  key={i}
                  variants={fadeUp}
                  className="flex items-center gap-6 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  whileHover={{ x: 8 }}
                >
                  <b className="text-3xl font-black text-indigo-400">{step.num}</b>
                  <div>
                    <strong className="text-lg">{step.title}</strong>
                    <span className="block text-slate-400 text-sm">{step.desc}</span>
                  </div>
                  <span className="ml-auto text-2xl">→</span>
                </motion.li>
              ))}
            </motion.ol>
          </div>
        </motion.section>

        {/* Tools Section */}
        <motion.section
          id="tools"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="zera-tools py-24"
        >
          <div className="container">
            <motion.p variants={fadeUp} className="zera-section-label">03 — THE TOOLKIT</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold mt-4">Tools that<br /><em className="text-indigo-600">earn their place.</em></motion.h2>
            <motion.div variants={stagger} className="zera-tool-grid grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
              {[
                { idx: '01', symbol: '↗', title: 'Syllabus workspace', desc: 'Bring the shape of your course into focus.', to: '/syllabus', color: 'from-indigo-500 to-purple-600' },
                { idx: '02', symbol: '✦', title: 'AI study support', desc: 'Ask, explore and break down difficult ideas.', to: '/ai-tools', color: 'from-teal-500 to-cyan-600' },
                { idx: '03', symbol: '?', title: 'Practice room', desc: 'Meet your knowledge with meaningful questions.', to: '/quiz', color: 'from-amber-500 to-orange-600' },
                { idx: '04', symbol: '↗', title: 'Progress dashboard', desc: 'See what you have done and where to go next.', to: '/dashboard', color: 'from-rose-500 to-pink-600' },
              ].map((tool, i) => (
                <TiltCard key={i} className="group">
                  <Link
                    to={tool.to}
                    className="block bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-2xl transition-shadow h-full"
                    
                    
                  >
                    <motion.div variants={fadeUp}>
                      <span className="text-sm font-mono text-slate-400">{tool.idx}</span>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white text-xl mt-4 mb-4 group-hover:scale-110 transition-transform`}>
                        {tool.symbol}
                      </div>
                      <h3 className="text-lg font-bold">{tool.title}</h3>
                      <p className="text-slate-600 text-sm mt-2">{tool.desc}</p>
                      <span className="text-indigo-600 text-sm font-medium mt-4 block group-hover:translate-x-1 transition-transform">Explore →</span>
                    </motion.div>
                  </Link>
                </TiltCard>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* Final CTA */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={stagger}
          className="py-32 text-center relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-teal-500 opacity-90"
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            style={{ backgroundSize: '200% 200%' }}
          />
          <div className="relative z-10 container">
            <motion.p variants={fadeUp} className="text-white/80 text-sm tracking-widest uppercase">Your new era starts here</motion.p>
            <motion.h2 variants={fadeUp} className="text-5xl md:text-7xl font-black text-white mt-4">STUDY WITH<br />DIRECTION.</motion.h2>
            <motion.div variants={fadeUp} className="mt-8">
              <MagneticButton className="bg-white text-indigo-600 px-8 py-4 rounded-xl font-bold text-lg shadow-2xl hover:shadow-indigo-500/25 transition-shadow" to="/signup">Create your account ↗</MagneticButton>
            </motion.div>
          </div>
        </motion.section>
      </main>

      <footer className="py-12 border-t border-slate-200 bg-white/50 backdrop-blur">
        <div className="container flex flex-col md:flex-row justify-between items-center gap-4">
          <Link to="/" className="zera-logo"><Logo /></Link>
          <p className="text-slate-500 text-sm">Your new era of learning.</p>
          <div className="flex gap-6 text-sm">
            <a href="/support" className="text-slate-500 hover:text-indigo-600">Support</a>
            <Link to="/login" className="text-slate-500 hover:text-indigo-600">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
