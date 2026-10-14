import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

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

  if (state.loading) return <Skeleton />;

  const hasSyllabus = (state.syllabi || []).length > 0;
  const nextAction = !hasSyllabus
    ? { label: 'Upload your syllabus', to: '/syllabus' }
    : (state.plans || []).length === 0
      ? { label: 'Generate your study plan', to: '/study-plan' }
      : { label: 'Review today’s tasks', to: '/study-plan' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
          <p className="text-sm text-slate-500">Your New Era of Learning</p>
        </div>
        <Link to={nextAction.to} className="btn-primary">{nextAction.label} →</Link>
      </div>

      {!hasSyllabus && (
        <div className="card border-dashed">
          <h2 className="font-semibold text-ink-900">Let’s get you started</h2>
          <p className="mt-1 text-sm text-slate-500">Upload your syllabus so ZERA can analyze it and build a personalized plan around your real subjects and topics.</p>
          <Link to="/syllabus" className="btn-primary mt-3">Upload syllabus</Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Stat title="Confirmed syllabi" value={(state.syllabi || []).length} />
        <Stat title="Study plans" value={(state.plans || []).length} />
        <Stat title="Quizzes attempted" value={(state.attempts || []).length} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="font-semibold text-ink-900">Performance</h3>
          {perf && perf.hasData ? (
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <p>Avg quiz accuracy: <span className="font-medium text-ink-900">{perf.quizzes.averageAccuracy ?? '—'}%</span></p>
              <p>Completed study tasks: <span className="font-medium text-ink-900">{perf.studyTasks.completed}/{perf.studyTasks.total}</span></p>
              <p>Topics needing revision: <span className="font-medium text-ink-900">{perf.syllabus.needsRevision}</span></p>
              {perf.recommendations?.[0] && <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-brand-800">{perf.recommendations[0]}</p>}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No activity yet. Attempt a quiz or complete a study task to see analytics here.</p>
          )}
        </div>
        <div className="card">
          <h3 className="font-semibold text-ink-900">Quick actions</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              ['/syllabus', 'Syllabus'], ['/study-plan', 'Study plan'], ['/quiz', 'Quiz'], ['/doubts', 'Doubt solver'],
              ['/notes', 'Notes'], ['/handwriting', 'Handwriting'], ['/performance', 'Performance'], ['/resources', 'Resources']
            ].map(([to, label]) => (
              <Link key={to} to={to} className="btn-ghost justify-start">{label}</Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="card">
      <div className="text-3xl font-bold text-brand-700">{value}</div>
      <div className="text-sm text-slate-500">{title}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-64 rounded bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-200" />)}
      </div>
      <div className="h-40 rounded-2xl bg-slate-200" />
    </div>
  );
}
