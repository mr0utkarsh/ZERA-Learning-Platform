import { useEffect, useState, ReactNode } from 'react';
import { api } from '../lib/api';

export default function Performance() {
  const [perf, setPerf] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.performance.get()
      .then(setPerf)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) return <p className="text-red-600">{error}</p>;

  if (!perf?.hasData) {
    return (
      <div className="card mx-auto max-w-2xl text-center">
        <h1 className="text-xl font-bold text-fg">No activity yet</h1>
        <p className="mt-2 text-sm text-slate-500">{perf?.message || 'Attempt a quiz, complete a study task, or update your syllabus progress to unlock analytics.'}</p>
        <p className="mt-3 text-xs text-slate-400">{perf?.methodology}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold text-fg">Performance analysis</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Quiz accuracy"><span className="text-3xl font-bold text-violet-300">{perf.quizzes.averageAccuracy ?? '—'}%</span></Card>
        <Card title="Study tasks done"><span className="text-3xl font-bold text-violet-300">{perf.studyTasks.completed}/{perf.studyTasks.total}</span></Card>
        <Card title="Topics needing revision"><span className="text-3xl font-bold text-amber-600">{perf.syllabus.needsRevision}</span></Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Strengths (≥70% accuracy)">
          {Array.isArray(perf.strengths) && perf.strengths.length ? <ul className="space-y-1 text-sm">{perf.strengths.map((s: any) => <li key={s.topicId}>✓ {s.title} · {s.accuracy}%</li>)}</ul> : <p className="text-sm text-slate-500">No strengths identified yet.</p>}
        </Card>
        <Card title="Needs attention (<50% accuracy)">
          {Array.isArray(perf.needsAttention) && perf.needsAttention.length ? <ul className="space-y-1 text-sm">{perf.needsAttention.map((s: any) => <li key={s.topicId}>! {s.title} · {s.accuracy}%</li>)}</ul> : <p className="text-sm text-slate-500">Nothing flagged.</p>}
        </Card>
      </div>
      <Card title="Recommended next actions">
        <ul className="space-y-1 text-sm text-slate-700">{Array.isArray(perf.recommendations) ? perf.recommendations.map((r: string, i: number) => <li key={i}>→ {r}</li>) : null}</ul>
      </Card>
      <p className="text-xs text-slate-400">{perf.methodology}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <div className="card"><h3 className="font-semibold text-fg">{title}</h3><div className="mt-2">{children}</div></div>;
}
function Skeleton() { return <div className="h-64 animate-pulse rounded-2xl bg-white/5" />; }
