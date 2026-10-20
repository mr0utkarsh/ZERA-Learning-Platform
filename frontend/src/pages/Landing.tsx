import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { useRef } from 'react';
import { Logo } from '../components/Logo';

const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: 'blur(10px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as any } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [12, -12]), { stiffness: 250, damping: 25 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-12, 12]), { stiffness: 250, damping: 25 });

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
      style={{ rotateX, rotateY, transformPerspective: 900 }}
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
  const springX = useSpring(x, { stiffness: 400, damping: 25 });
  const springY = useSpring(y, { stiffness: 400, damping: 25 });

  const handleMouse = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left - rect.width / 2) * 0.35);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.35);
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
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.7], [1, 0.9]);

  return (
    <div className="zera-home bg-[#050510] text-white min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#050510] to-[#0a0a1a]" />
        <motion.div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }}
          animate={{ x: [0, 120, -60, 0], y: [0, -80, 40, 0], scale: [1, 1.3, 0.9, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%)' }}
          animate={{ x: [0, -100, 60, 0], y: [0, 60, -40, 0], scale: [0.9, 1.2, 1, 0.9] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)' }}
          animate={{ x: [0, 80, -40, 0], y: [0, -60, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <header className="zera-header sticky top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="zera-logo" aria-label="ZERA home">
            <Logo />
          </Link>
          <nav className="zera-nav hidden gap-8 md:flex" aria-label="Main navigation">
            <a href="#experience" className="text-slate-400 transition-colors hover:text-white">Experience</a>
            <a href="#journey" className="text-slate-400 transition-colors hover:text-white">Journey</a>
            <a href="#tools" className="text-slate-400 transition-colors hover:text-white">Tools</a>
            <a href="/resources" className="text-slate-400 transition-colors hover:text-white">Resources</a>
          </nav>
          <div className="header-actions flex items-center gap-3 sm:gap-4">
            <Link className="text-slate-400 transition-colors hover:text-white" to="/login">Log in</Link>
            <MagneticButton className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-shadow hover:shadow-indigo-500/40 sm:px-5" to="/signup">Join ZERA ↗</MagneticButton>
          </div>
        </div>
      </header>

      <main>
        <motion.section
          ref={heroRef}
          style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
          className="zera-hero relative flex min-h-screen items-center pt-20"
          aria-labelledby="hero-title"
        >
          <div className="zera-hero-grid mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-2">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="zera-hero-copy">
              <motion.p variants={fadeUp} className="text-indigo-400 text-sm font-semibold tracking-widest uppercase mb-4 flex items-center gap-2">
                <span className="w-8 h-px bg-indigo-500" /> A more intentional way to learn
              </motion.p>
              <motion.h1 variants={fadeUp} id="hero-title" className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-none">
                MAKE<br />LEARNING<br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-teal-400 bg-clip-text text-transparent">YOURS.</span>
              </motion.h1>
              <motion.p variants={fadeUp} className="text-slate-400 text-lg max-w-md mt-6">
                One place to shape your syllabus, build a study rhythm, test your understanding, and keep moving forward.
              </motion.p>
              <motion.div variants={fadeUp} className="zera-hero-actions mt-10 flex flex-wrap items-center gap-4">
                <MagneticButton className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-7 py-4 font-bold text-white shadow-2xl shadow-indigo-500/30 transition-all hover:shadow-indigo-500/50 sm:px-8" to="/signup">
                  Begin your journey ↗
                </MagneticButton>
                <a className="flex w-full items-center justify-center gap-2 px-4 py-4 text-slate-400 transition-colors hover:text-white sm:w-auto sm:justify-start" href="#experience">
                  Discover ZERA <span>↓</span>
                </a>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 60, rotateY: -20 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] as any }}
              className="zera-hero-art relative hidden md:block"
            >
              <TiltCard className="relative">
                <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-2xl shadow-indigo-500/10">
                  <small className="text-xs font-semibold text-indigo-400 tracking-widest uppercase">Your Learning Space</small>
                  <strong className="block text-3xl font-bold mt-3 leading-tight">Focused.<br />Connected.<br /><span className="text-indigo-400">Yours.</span></strong>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-sm text-slate-400">Always in motion</span>
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {['Syllabus', 'Practice', 'Progress'].map((t, i) => (
                      <div key={i} className="bg-white/5 rounded-xl p-3 text-center text-xs text-slate-300 border border-white/5">
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              </TiltCard>
              <motion.div
                className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-xl"
                style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.6) 0%, transparent 70%)' }}
                animate={{ y: [0, -25, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute -bottom-10 -left-10 w-20 h-20 rounded-2xl blur-lg"
                style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.5) 0%, transparent 70%)' }}
                animate={{ y: [0, 20, 0], rotate: [0, 45, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
          </div>
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-xs text-slate-500 tracking-widest">SCROLL</span>
            <div className="w-px h-8 bg-gradient-to-b from-indigo-500 to-transparent" />
          </motion.div>
        </motion.section>

        <motion.section
          id="experience"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="relative py-20 md:py-32"
        >
          <div className="container max-w-6xl mx-auto px-6">
            <motion.p variants={fadeUp} className="text-indigo-400 text-sm font-semibold tracking-widest uppercase mb-4">01 — The ZERA Experience</motion.p>
            <div className="grid md:grid-cols-2 gap-16 items-start">
              <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-bold leading-tight">
                Less noise.<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-400">More progress.</span>
              </motion.h2>
              <motion.div variants={fadeUp}>
                <p className="text-slate-400 text-lg leading-relaxed">
                  ZERA brings the work that matters into a clear, connected learning space—without pretending every learner has the same starting line.
                </p>
                <a href="/about" className="inline-flex items-center gap-2 text-indigo-400 font-medium mt-6 hover:gap-3 transition-all">
                  Why we built ZERA <span>↗</span>
                </a>
              </motion.div>
            </div>
            <motion.div variants={stagger} className="grid md:grid-cols-3 gap-6 mt-20">
              {[
                { num: '01', title: 'Start with clarity', desc: 'Turn a broad syllabus into the next useful thing to understand.', gradient: 'from-indigo-500/20 to-purple-500/20' },
                { num: '02', title: 'Practise with purpose', desc: 'Use quizzes, mock tests, notes and revision tools around your own goals.', gradient: 'from-teal-500/20 to-cyan-500/20' },
                { num: '03', title: 'Keep your momentum', desc: 'Make progress visible so a difficult week never becomes a lost month.', gradient: 'from-amber-500/20 to-orange-500/20' },
              ].map((v, i) => (
                <TiltCard key={i} className="group">
                  <motion.div
                    variants={fadeUp}
                    className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-colors h-full overflow-hidden"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${v.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    <div className="relative z-10">
                      <span className="text-5xl font-black text-white/10">{v.num}</span>
                      <h3 className="text-xl font-bold mt-2">{v.title}</h3>
                      <p className="text-slate-400 mt-3 text-sm leading-relaxed">{v.desc}</p>
                    </div>
                  </motion.div>
                </TiltCard>
              ))}
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          id="journey"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={stagger}
          className="relative py-20 md:py-32"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/20 to-transparent" />
          <div className="container max-w-6xl mx-auto px-6 relative z-10">
            <motion.p variants={fadeUp} className="text-indigo-400 text-sm font-semibold tracking-widest uppercase mb-4">02 — Designed for the whole journey</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-bold mt-4 leading-tight">
              From "where do I start?"<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-400">to "what's next?"</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-400 text-lg mt-6 max-w-xl">
              Plan your study time, work through concepts, and review what needs attention. ZERA keeps each step close to the next.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8">
              <MagneticButton className="px-8 py-4 rounded-xl bg-white text-[#050510] font-bold shadow-2xl hover:shadow-white/20 transition-all" to="/onboarding">
                Set up your learning space ↗
              </MagneticButton>
            </motion.div>
            <motion.div variants={stagger} className="mt-20 space-y-3">
              {[
                { num: '01', title: 'Shape your syllabus', desc: 'Organise subjects, units and priorities.' },
                { num: '02', title: 'Learn in your rhythm', desc: 'Study plans and AI support when you need them.' },
                { num: '03', title: 'Test what you know', desc: 'Quizzes and mock tests turn review into action.' },
                { num: '04', title: 'Reflect and continue', desc: 'Use real activity to choose your next session.' },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="flex items-center gap-6 p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all cursor-pointer group"
                  whileHover={{ x: 10 }}
                >
                  <b className="text-3xl font-black text-indigo-500/60 group-hover:text-indigo-400 transition-colors">{step.num}</b>
                  <div className="flex-1">
                    <strong className="text-lg font-semibold">{step.title}</strong>
                    <span className="block text-slate-500 text-sm mt-1">{step.desc}</span>
                  </div>
                  <motion.span
                    className="text-2xl text-slate-600 group-hover:text-indigo-400 transition-colors"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                  >
                    →
                  </motion.span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          id="tools"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={stagger}
          className="relative py-20 md:py-32"
        >
          <div className="container max-w-6xl mx-auto px-6">
            <motion.p variants={fadeUp} className="text-indigo-400 text-sm font-semibold tracking-widest uppercase mb-4">03 — The toolkit</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-bold mt-4">
              Tools that<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-400">earn their place.</span>
            </motion.h2>
            <motion.div variants={stagger} className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mt-16">
              {[
                { idx: '01', symbol: '↗', title: 'Syllabus workspace', desc: 'Bring the shape of your course into focus.', to: '/syllabus', gradient: 'from-indigo-500 to-purple-600' },
                { idx: '02', symbol: '✦', title: 'AI study support', desc: 'Ask, explore and break down difficult ideas.', to: '/ai-tools', gradient: 'from-teal-500 to-cyan-600' },
                { idx: '03', symbol: '?', title: 'Practice room', desc: 'Meet your knowledge with meaningful questions.', to: '/quiz', gradient: 'from-amber-500 to-orange-600' },
                { idx: '04', symbol: '↗', title: 'Progress dashboard', desc: 'See what you have done and where to go next.', to: '/dashboard', gradient: 'from-rose-500 to-pink-600' },
              ].map((tool, i) => (
                <TiltCard key={i} className="group">
                  <Link
                    to={tool.to}
                    className="block bg-white/[0.03] backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all h-full relative overflow-hidden"
                  >
                    <motion.div variants={fadeUp}>
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-xs font-mono text-slate-500">{tool.idx}</span>
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center text-white text-lg shadow-lg group-hover:scale-110 transition-transform`}>
                          {tool.symbol}
                        </div>
                      </div>
                      <h3 className="text-lg font-bold">{tool.title}</h3>
                      <p className="text-slate-500 text-sm mt-2 leading-relaxed">{tool.desc}</p>
                      <span className="text-indigo-400 text-sm font-medium mt-6 block group-hover:translate-x-2 transition-transform">Explore →</span>
                    </motion.div>
                  </Link>
                </TiltCard>
              ))}
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="relative overflow-hidden py-20 md:py-32"
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.1) 50%, rgba(20,184,166,0.15) 100%)' }}
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          <div className="relative z-10 container max-w-4xl mx-auto px-6 text-center">
            <motion.p variants={fadeUp} className="text-indigo-400 text-sm tracking-widest uppercase mb-4">Your new era starts here</motion.p>
            <motion.h2 variants={fadeUp} className="text-5xl md:text-7xl font-black leading-tight">
              STUDY WITH<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-teal-400">DIRECTION.</span>
            </motion.h2>
            <motion.div variants={fadeUp} className="mt-10">
              <MagneticButton className="px-10 py-5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all" to="/signup">
                Create your account ↗
              </MagneticButton>
            </motion.div>
          </div>
        </motion.section>
      </main>

      <footer className="py-12 border-t border-white/5 bg-black/20 backdrop-blur">
        <div className="container max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <Link to="/" className="zera-logo"><Logo /></Link>
          <p className="text-slate-500 text-sm">Your new era of learning.</p>
          <div className="flex gap-6 text-sm">
            <a href="/support" className="text-slate-500 hover:text-white transition-colors">Support</a>
            <Link to="/login" className="text-slate-500 hover:text-white transition-colors">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}