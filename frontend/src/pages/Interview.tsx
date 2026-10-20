import { FormEvent, useState } from 'react';
import { api } from '../lib/api';

export default function Interview() {
  const [role, setRole] = useState('');
  const [type, setType] = useState('technical');
  const [skills, setSkills] = useState('');
  const [session, setSession] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const start = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const s = await api.interviews.start({ role, interviewType: type, skills: skills.split(',').map((x) => x.trim()).filter(Boolean) });
      setSession(s); setFeedback(null); setAnswers({});
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const res = await api.interviews.evaluate(session.id, session.questions.map((q: any) => ({ questionId: q.id, answer: answers[q.id] || '' })));
      setFeedback(res.feedback); setSession(null);
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-fg">Mock interview</h1>

      {!session && (
        <form onSubmit={start} className="card space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <input className="input sm:col-span-2" placeholder="Target role (e.g. Backend Engineer)" value={role} onChange={(e) => setRole(e.target.value)} required />
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="technical">technical</option><option value="hr">hr</option><option value="behavioral">behavioral</option><option value="mixed">mixed</option>
            </select>
          </div>
          <input className="input" placeholder="Skills (comma separated)" value={skills} onChange={(e) => setSkills(e.target.value)} />
          <button className="btn-primary" disabled={busy}>{busy ? 'Starting…' : 'Start interview'}</button>
          {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-error ring-1 ring-red-500/20">{error}</p>}
        </form>
      )}

      {session && (
        <form onSubmit={submit} className="card space-y-4">
          <div className="text-sm text-slate-500">{session.role} · {session.interviewType} · {session.questions.length} questions</div>
          {session.questions.map((q: any, i: number) => (
            <div key={q.id}>
              <label className="label">{i + 1}. {q.prompt}</label>
              <textarea className="input min-h-20" value={answers[q.id] || ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
            </div>
          ))}
          <button className="btn-primary" disabled={busy}>{busy ? 'Evaluating…' : 'Submit answers'}</button>
        </form>
      )}

      {feedback && (
        <div className="card">
          <div className="text-3xl font-bold text-violet-300">{feedback.overall}<span className="text-base font-normal text-slate-400">/100</span></div>
          <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{feedback.disclaimer}</p>
          {Array.isArray(feedback.missingConcepts) && feedback.missingConcepts.length > 0 && (
            <div className="mt-3">
              <h3 className="font-semibold text-fg">Missing concepts</h3>
              <p className="text-sm text-slate-600">{feedback.missingConcepts.join(', ')}</p>
            </div>
          )}
          <div className="mt-3">
            <h3 className="font-semibold text-fg">Suggestions</h3>
            <ul className="mt-1 space-y-1 text-sm text-slate-600">{Array.isArray(feedback.suggestions) ? feedback.suggestions.map((s: string, i: number) => <li key={i}>→ {s}</li>) : null}</ul>
          </div>
        </div>
      )}
    </div>
  );
}
