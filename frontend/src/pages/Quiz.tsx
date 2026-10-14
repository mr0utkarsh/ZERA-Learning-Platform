import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Quiz() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);

  const load = () => api.quiz.list().then(setQuizzes).catch(() => setQuizzes([]));
  useEffect(() => { load(); }, []);

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const gen = await api.ai.generateQuiz({ topic, difficulty, count });
      const quiz = await api.quiz.create({ title: gen.title || `${topic} practice`, difficulty, questions: gen.questions });
      await load();
      start(quiz.id);
    } catch (err: any) { setError(err.message || 'Could not generate a quiz.'); }
    finally { setBusy(false); }
  };

  const start = async (id: string) => {
    setResult(null); setAnswers({}); setError('');
    try { setActive(await api.quiz.get(id)); } catch (err: any) { setError(err.message); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.quiz.submit(active.id, Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })));
      setResult(res); setActive(null); load();
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-ink-900">AI quiz generator</h1>
      {!active && (
        <form onSubmit={generate} className="card space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <input className="input sm:col-span-2" placeholder="Topic (e.g. Normalization)" value={topic} onChange={(e) => setTopic(e.target.value)} required />
            <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="easy">easy</option><option value="medium">medium</option><option value="hard">hard</option>
            </select>
            <input className="input" type="number" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </div>
          <button className="btn-primary" disabled={busy}>{busy ? 'Generating…' : 'Generate quiz'}</button>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </form>
      )}

      {active && (
        <form onSubmit={submit} className="card space-y-4">
          <h2 className="font-semibold text-ink-900">{active.title}</h2>
          {active.questions.map((q: any, i: number) => (
            <fieldset key={q.id} className="rounded-xl bg-slate-50 p-3">
              <legend className="px-1 text-sm font-medium">{i + 1}. {q.prompt}</legend>
              <div className="mt-2 space-y-1">
                {q.options.map((opt: string) => (
                  <label key={opt} className="flex items-center gap-2 text-sm">
                    <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
                    {opt}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <div className="flex gap-2">
            <button className="btn-primary">Submit answers</button>
            <button type="button" className="btn-ghost" onClick={() => setActive(null)}>Cancel</button>
          </div>
        </form>
      )}

      {result && (
        <div className="card">
          <div className="text-3xl font-bold text-brand-700">{result.percentage}%</div>
          <p className="text-sm text-slate-500">{result.attempt.score}/{result.attempt.totalQuestions} correct</p>
          <ul className="mt-3 space-y-2">
            {result.review.map((r: any) => (
              <li key={r.questionId} className={`rounded-lg p-3 text-sm ${r.correct ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="font-medium">{r.correct ? '✓' : '✗'} {r.prompt}</div>
                {!r.correct && <div className="text-slate-600">Your answer: {r.yourAnswer || '—'}</div>}
                <div className="text-slate-700">Correct: {r.correctAnswer}</div>
                {r.explanation && <div className="mt-1 text-slate-500">{r.explanation}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {quizzes.length > 0 && !active && !result && (
        <div className="card">
          <h3 className="font-semibold text-ink-900">Saved quizzes</h3>
          <div className="mt-2 space-y-2">
            {quizzes.map((q) => (
              <button key={q.id} onClick={() => start(q.id)} className="flex w-full justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50">
                <span className="text-sm font-medium">{q.title}</span>
                <span className="text-xs text-slate-400">{q._count?.questions} questions</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
