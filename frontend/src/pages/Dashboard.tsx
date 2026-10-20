import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Clock, BookOpen, Target, Activity } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [state, setState] = useState<any>({ loading: true });
  const [perf, setPerf] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const [syllabi, plans, attempts, notes] = await Promise.all([
          api.syllabus.list().catch(() => []),
          api.studyPlans.list().catch(() => []),
          api.quiz.attempts().catch(() => []),
          api.handwriting.list().catch(() => [])
        ]);
        setState({ loading: false, syllabi, plans, attempts, notes });
        setPerf(await api.performance.get().catch(() => null));
      } catch (e: any) {
        setState({ loading: false, error: e.message });
      }
    })();
  }, []);

  if (state.loading) return (
    <div className="min-h-screen bg-void text-fg flex items-center justify-center">
      <div className="loading-spinner" />
    </div>
  );

  const hasSyllabus = (state.syllabi || []).length > 0;
  const nextAction = !hasSyllabus
    ? { label: 'Upload your syllabus', to: '/syllabus' }
    : (state.plans || []).length === 0
      ? { label: 'Generate your study plan', to: '/study-plan' }
      : { label: 'Review today’s tasks', to: '/study-plan' };

  const stats = [
    { label: 'Syllabi confirmed', value: (state.syllabi || []).length, icon: BookOpen, color: 'text-violet-300' },
    { label: 'Study plans', value: (state.plans || []).length, icon: Clock, color: 'text-cyan-300' },
    { label: 'Quizzes attempted', value: (state.attempts || []).length, icon: Activity, color: 'text-success' },
  ];

  return (
    <div className="min-h-screen bg-void text-fg py-8 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-fg mb-1">
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-sm text-muted">Your New Era of Learning</p>
          </div>
          <Link to={nextAction.to} className="btn-primary px-6 py-3">
            {nextAction.label} →
          </Link>
        </div>

        {!hasSyllabus && (
          <div className="card-lift zera-card p-6 mb-8">
            <div className="flex items-center gap-3 mb-3">
              <Target className="h-5 w-5 text-violet-300" />
              <h2 className="text-lg font-semibold text-fg">Let’s get you started</h2>
            </div>
            <p className="text-sm text-muted mb-4">
              Upload your syllabus so ZERA can analyze it and build a personalized plan around your real subjects and topics.
            </p>
            <Link to="/syllabus" className="btn-primary">Upload syllabus</Link>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {stats.map((s, i) => (
            <div key={i} className="card-lift zera-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-sm text-muted">{s.label}</div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5">
                  <s.icon className="h-5 w-5 text-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Performance card */}
          <div className="card-lift zera-card p-6 col-span-1 md:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-fg">Performance</h3>
                <p className="text-sm text-muted">Your learning activity at a glance</p>
              </div>
              <Link to="/performance" className="text-sm text-violet-300 hover:underline">View all →</Link>
            </div>
            {perf && perf.hasData ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 rounded-xl bg-surface-2 border border-white/5">
                    <div className="text-xs text-muted uppercase tracking-wider mb-1">Quiz accuracy</div>
                    <div className="text-2xl font-bold text-fg">{perf.quizzes.averageAccuracy ?? '—'}%</div>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-2 border border-white/5">
                    <div className="text-xs text-muted uppercase tracking-wider mb-1">Tasks completed</div>
                    <div className="text-2xl font-bold text-fg">
                      {perf.studyTasks.completed}/{perf.studyTasks.total}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-2 border border-white/5">
                    <div className="text-xs text-muted uppercase tracking-wider mb-1">Needs revision</div>
                    <div className="text-2xl font-bold text-warning">{perf.syllabus.needsRevision}</div>
                  </div>
                </div>
                {perf.recommendations?.[0] && (
                  <div className="mt-4 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <p className="text-sm text-violet-200">{perf.recommendations[0]}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted">No activity yet. Attempt a quiz or complete a study task to see analytics here.</p>
              </div>
            )}
          </div>

          {/* Quick actions card */}
          <div className="card-lift zera-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-fg">Quick actions</h3>
                <p className="text-sm text-muted">Jump to your tools</p>
              </div>
            </div>
            <div className="grid gap-2">
              {([
                { to: '/syllabus', label: 'Syllabus', Icon: BookOpen },
                { to: '/study-plan', label: 'Study plan', Icon: Clock },
                { to: '/quiz', label: 'Quiz', Icon: Activity },
                { to: '/ai-tools', label: 'AI Study Support', Icon: null },
                { to: '/notes', label: 'Notes', Icon: null },
                { to: '/resources', label: 'Resources', Icon: null },
              ]).map(({ to, label, Icon }, i) => (
                <Link
                  key={i}
                  to={to}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 bg-surface-2 border border-white/5 text-sm text-fg hover:bg-white/5 hover:border-white/10 transition-colors"
                >
                  {Icon && <Icon className="h-5 w-5 text-muted" />}
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
