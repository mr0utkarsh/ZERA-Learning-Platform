import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { ShieldCheck, Lightbulb, Users, Route } from 'lucide-react';

export default function About() {
  const features = [
    {
      icon: Lightbulb,
      title: 'Intentional learning',
      desc: 'ZERA replaces endless scrolling with a focused rhythm: syllabus, session, revision, reflection.',
    },
    {
      icon: Route,
      title: 'Personalised syllabus',
      desc: 'Upload your course outline and ZERA breaks it into subjects, units and topics you can actually finish.',
    },
    {
      icon: ShieldCheck,
      title: 'Progress you can see',
      desc: 'Topic-level completion tracking and confidence ratings show exactly where you stand.',
    },
    {
      icon: Users,
      title: 'Student-first design',
      desc: 'Built for calm, deep work — not gamified distractions or ads.',
    },
  ];

  const philosophy = [
    'Learn in rhythm, not in cram sessions.',
    'Understanding beats memorisation.',
    'Progress is measured by confidence, not just completion.',
    'Every student deserves a plan that adapts to them.',
  ];

  return (
    <div className="min-h-screen bg-void text-fg">
      <div className="container max-w-4xl mx-auto px-6 py-12 md:py-20">
        <nav className="mb-12">
          <Link to="/" className="btn-ghost mb-2 inline-flex items-center gap-2 text-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/><path d="M19 12H5"/></svg>
            Back to home
          </Link>
        </nav>

        <div className="flex items-center gap-4 mb-12">
          <Logo variant="primary" className="h-10" showWordmark />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-fg">
            About ZERA
          </h1>
        </div>

        <p className="text-lg text-muted mb-12 leading-relaxed">
          ZERA is a student’s new era of focused, intentional learning. We built it because
          most learning platforms feel like content factories — endless videos, badges and
          notifications that optimise for time spent, not understanding gained.
        </p>

        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Why ZERA exists</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <div key={i} className="card-lift zera-card p-6">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-violet-300">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Our learning philosophy</h2>
          <ul className="space-y-4 text-sm text-muted leading-relaxed max-w-xl">
            {philosophy.map((p, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 mt-1 text-xs font-bold text-violet-300">{i + 1}</span>
                <p>{p}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-8">Student-centered approach</h2>
          <p className="text-lg text-muted mb-8 leading-relaxed">
            ZERA puts the student in control. You choose your subjects, set your goals,
            define your weekly rhythm, and decide when a topic is truly understood — not
            when an algorithm says so.
          </p>
          <div className="flex gap-3">
            <Link to="/signup" className="btn-primary flex-1 py-3 text-center">
              Start your journey
            </Link>
            <Link to="/resources" className="btn-secondary flex-1 py-3 text-center">
              Explore resources
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}