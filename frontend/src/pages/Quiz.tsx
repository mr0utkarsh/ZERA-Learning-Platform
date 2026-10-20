import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Dumbbell, AlertCircle } from 'lucide-react';

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
  const [currentQ, setCurrentQ] = useState(0);

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
    setResult(null); setAnswers({}); setError(''); setCurrentQ(0);
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
    <div className="min-h-screen bg-void text-fg py-6 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Dumbbell className="h-5 w-5 text-violet-300 shrink-0" />
          <h1 className="text-3xl font-bold text-fg">Practice Room</h1>
        </div>

        {!active && !result && (
          <>
            <form onSubmit={generate} className="card-lift zera-card p-6 mb-8 space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <label className="field-label">Topic</label>
                  <input className="field-input" placeholder="e.g. Normalization" value={topic} onChange={(e) => setTopic(e.target.value)} required />
                </div>
                <div>
                  <label className="field-label">Difficulty</label>
                  <select className="field-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Questions</label>
                  <input className="field-input" type="number" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} />
                </div>
              </div>
              <button className="btn-primary w-full py-3" disabled={busy}>{busy ? 'Generating…' : 'Generate quiz'}</button>
              {error && (
                <div className="rounded-xl bg-red-500/10 px-3 py-2.5 ring-1 ring-red-500/20 text-sm text-error flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </form>

            {quizzes.length > 0 && (
              <div className="card-lift zera-card p-6">
                <h3 className="text-lg font-bold text-fg mb-4">Saved quizzes</h3>
                <div className="space-y-2">
                  {quizzes.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => start(q.id)}
                      className="flex w-full items-center justify-between rounded-xl px-4 py-3 bg-surface-2 border border-white/5 text-left text-sm hover:bg-white/5 transition-colors"
                    >
                      <span className="font-medium text-fg">{q.title}</span>
                      <span className="text-xs text-muted">{q._count?.questions ?? 0} questions</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {active && !result && (
          <form onSubmit={submit} className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-fg">{active.title}</h2>
                <p className="text-sm text-muted">{active.difficulty} · {active.questions.length} questions</p>
              </div>
              <span className="text-xs font-bold text-violet-300 bg-violet-500/10 px-2 py-1 rounded">
                {currentQ + 1} / {active.questions.length}
              </span>
            </div>

            {active.questions?.[currentQ] && (
              <div className="card-lift zera-card p-6">
                <div className="text-lg font-semibold text-fg mb-4">
                  {currentQ + 1}. {active.questions[currentQ].prompt}
                </div>
                <div className="space-y-3">
                  {active.questions[currentQ].options.map((opt: string) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 border cursor-pointer transition-colors ${
                        answers[active.questions[currentQ].id] === opt
                          ? 'bg-violet-500/10 border-violet-500/50 text-violet-200'
                          : 'bg-surface-2 border-white/5 text-fg hover:bg-white/5'
                      }`}
                    >
                      <input
                        type="radio"
                        name={active.questions[currentQ].id}
                        value={opt}
                        checked={answers[active.questions[currentQ].id] === opt}
                        onChange={(e) => setAnswers((a) => ({ ...a, [active.questions[currentQ].id]: e.target.value }))}
                        className="h-5 w-5 text-violet-500"
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                disabled={currentQ === 0}
                onClick={() => setCurrentQ(currentQ - 1)}
                className="btn-secondary px-6 py-3 flex-1"
              >
                Back
              </button>
              {currentQ >= active.questions.length - 1 ? (
                <button className="btn-primary px-8 py-3" disabled={!answers[active.questions[currentQ]?.id]}>
                  Submit answers
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentQ(currentQ + 1)}
                  className="btn-primary px-8 py-3"
                  disabled={!answers[active.questions[currentQ]?.id]}
                >
                  Next →
                </button>
              )}
              <button
                type="button"
                onClick={() => setActive(null)}
                className="btn-ghost px-6 py-3"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {result && (
          <div className="card-lift zera-card p-8 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/20 mb-6">
              <span className="text-4xl font-bold text-violet-300">{result.percentage}%</span>
            </div>
            <h2 className="text-2xl font-bold text-fg mb-2">Quiz complete</h2>
            <p className="text-sm text-muted mb-6">
              {result.attempt.score} / {result.attempt.totalQuestions} correct
            </p>

            <div className="space-y-3 mb-8 max-w-xl mx-auto">
              {result.review.map((r: any) => (
                <div
                  key={r.questionId}
                  className={`rounded-xl p-4 border ${
                    r.correct
                      ? 'bg-success/10 border-success/50'
                      : 'bg-red-500/10 border-red-500/50'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <span className={`shrink-0 mt-1 ${r.correct ? 'text-success' : 'text-error'}`}>
                      {r.correct ? '✓' : '✗'}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-fg">{r.prompt}</div>
                      {!r.correct && (
                        <div className="mt-1 text-xs text-muted">Your answer: {r.yourAnswer || '—'}</div>
                      )}
                      <div className="mt-1 text-xs text-success">Correct: {r.correctAnswer}</div>
                    </div>
                  </div>
                  {r.explanation && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <p className="text-xs text-muted">{r.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-center">
              <Link to="/dashboard" className="btn-secondary px-8 py-3">
                Back to dashboard
              </Link>
              <button
                onClick={() => { setResult(null); load(); }}
                className="btn-primary px-8 py-3"
              >
                Try another quiz
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
