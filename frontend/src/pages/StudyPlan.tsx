import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function StudyPlan() {
  const [syllabi, setSyllabi] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [syllabusId, setSyllabusId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [s, p] = await Promise.all([api.syllabus.list().catch(() => []), api.studyPlans.list().catch(() => [])]);
    setSyllabi(s); setPlans(p);
  };
  useEffect(() => { load(); }, []);

  const generate = async () => {
    setError(''); setBusy(true);
    try {
      const id = syllabusId || (syllabi[0] && syllabi[0].id);
      if (!id) { setError('Confirm a syllabus first.'); setBusy(false); return; }
      const plan = await api.studyPlans.generate({ syllabusId: id });
      setCurrent(plan);
      load();
    } catch (e: any) { setError(e.message || 'Could not generate a plan.'); }
    finally { setBusy(false); }
  };

  const open = async (id: string) => {
    try { setCurrent(await api.studyPlans.get(id)); } catch (e: any) { setError(e.message); }
  };

  const complete = async (taskId: string) => {
    await api.studyPlans.completeTask(taskId).catch(() => null);
    if (current) setCurrent(await api.studyPlans.get(current.id));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="card">
        <h1 className="text-xl font-bold text-ink-900">Personalized study plan</h1>
        <p className="text-sm text-slate-500">Generated from your confirmed syllabus, availability, and exam date. Every task links to a real topic.</p>
        <div className="mt-3 flex gap-2">
          <select className="input max-w-xs" value={syllabusId} onChange={(e) => setSyllabusId(e.target.value)}>
            <option value="">Select syllabus</option>
            {syllabi.map((s) => <option key={s.id} value={s.id}>{s.courseName}{s.semester ? ` · ${s.semester}` : ''}</option>)}
          </select>
          <button className="btn-primary" onClick={generate} disabled={busy}>{busy ? 'Generating…' : 'Generate plan'}</button>
        </div>
        {error && <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>

      {plans.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-ink-900">Your plans</h3>
          <div className="mt-2 space-y-2">
            {plans.map((p) => (
              <button key={p.id} onClick={() => open(p.id)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50">
                <span className="text-sm font-medium">{p.title}</span>
                <span className="text-xs text-slate-400">{p.generator} · {p._count?.tasks ?? '?'} tasks</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {current && (
        <div className="card">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink-900">{current.title}</h3>
            <span className="rounded-full bg-brand-50 px-2 py-1 text-xs text-brand-700">{current.generator}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{current.description}</p>
          <ul className="mt-3 divide-y divide-slate-100">
            {current.tasks?.map((t: any) => (
              <li key={t.id} className="flex items-center gap-3 py-2">
                <input type="checkbox" checked={t.status === 'COMPLETED'} onChange={() => complete(t.id)} aria-label={`Complete ${t.title}`} />
                <span className={`flex-1 text-sm ${t.status === 'COMPLETED' ? 'text-slate-400 line-through' : ''}`}>{t.title}</span>
                <span className="text-xs text-slate-400">{t.kind}</span>
                {t.dueDate && <span className="text-xs text-slate-400">{new Date(t.dueDate).toLocaleDateString()}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
