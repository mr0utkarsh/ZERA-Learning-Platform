import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ErrorAlert, PageSpinner, EmptyState, ServiceNotice } from '../components/ui';
import { fmtDateTime } from '../utils/format';

export function QuizGeneratorForm({ type = 'QUIZ', onGenerated }) {
  const [form, setForm] = useState({ subject: '', scope: '', difficulty: 'MEDIUM', count: type === 'MOCK_TEST' ? 15 : 10, timeLimitMin: 30 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [aiOff, setAiOff] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const generate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setAiOff(false);
    try {
      const d = await api.post('/quizzes/generate', { ...form, type });
      onGenerated?.(d.quiz);
      navigate(`/${type === 'MOCK_TEST' ? 'tests' : 'quiz'}/run/${d.quiz.id}`);
    } catch (err) {
      setError(err);
      if (err.code === 'AI_NOT_CONFIGURED') setAiOff(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={generate}>
      <h3>{type === 'MOCK_TEST' ? '📝 Generate a mock test' : '❓ Generate a quiz'}</h3>
      {aiOff && <ServiceNotice service="AI quiz generation" hint="Quizzes are created by the AI from your subject and topic, so they need a configured AI provider." />}
      <ErrorAlert error={aiOff ? null : error} />
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="q-subject">Subject *</label>
          <input id="q-subject" className="input" value={form.subject} onChange={set('subject')} required placeholder="e.g. DBMS, Physics" />
        </div>
        <div className="field">
          <label htmlFor="q-scope">Chapter / topic (optional)</label>
          <input id="q-scope" className="input" value={form.scope} onChange={set('scope')} placeholder="e.g. Normalization" />
        </div>
        <div className="field">
          <label htmlFor="q-diff">Difficulty</label>
          <select id="q-diff" className="select" value={form.difficulty} onChange={set('difficulty')}>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="q-count">Number of questions</label>
          <input id="q-count" type="number" className="input" min={3} max={type === 'MOCK_TEST' ? 30 : 20} value={form.count} onChange={set('count')} />
        </div>
        {type === 'MOCK_TEST' && (
          <div className="field">
            <label htmlFor="q-time">Time limit (minutes)</label>
            <input id="q-time" type="number" className="input" min={5} max={180} value={form.timeLimitMin} onChange={set('timeLimitMin')} />
          </div>
        )}
      </div>
      <button className="btn btn-primary" disabled={busy || !form.subject.trim()}>
        {busy ? <><span className="spinner" style={{ width: 15, height: 15 }} /> Generating…</> : `Generate ${type === 'MOCK_TEST' ? 'mock test' : 'quiz'}`}
      </button>
    </form>
  );
}

export default function Quiz() {
  const [data, setData] = useState(null);
  const [attempts, setAttempts] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setError(null);
    api.get('/quizzes?type=QUIZ').then((d) => setData(d.quizzes)).catch(setError);
    api.get('/quizzes/attempts?type=QUIZ').then((d) => setAttempts(d.attempts)).catch(() => {});
  };
  useEffect(load, []);

  if (!data && !error) return <PageSpinner label="Loading quizzes…" />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Quizzes</h1>
          <p className="sub">Generate AI quizzes on any subject or topic, then test yourself.</p>
        </div>
      </div>
      <ErrorAlert error={error} onRetry={load} />

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <QuizGeneratorForm type="QUIZ" />

        <div className="card">
          <h3>Your quizzes</h3>
          {data && data.length === 0 ? (
            <EmptyState icon="❓" title="No quizzes yet" message="Generate your first quiz using the form." />
          ) : (
            data.map((q) => (
              <div className="list-item" key={q.id}>
                <div className="grow">
                  <div className="t">{q.title}</div>
                  <div className="s">{q.questionCount} questions · {q.difficulty} · {fmtDateTime(q.createdAt)}</div>
                </div>
                <Link className="btn btn-primary btn-sm" to={`/quiz/run/${q.id}`}>Take</Link>
                <button className="btn btn-ghost btn-sm" aria-label={`Delete ${q.title}`}
                  onClick={async () => { await api.delete(`/quizzes/${q.id}`); load(); }}>🗑</button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card mt-20">
        <h3>Recent attempts</h3>
        {attempts && attempts.length === 0 ? (
          <p className="muted mb-0">No attempts yet. Take a quiz and your scores will appear here.</p>
        ) : (
          <div className="table-wrap" style={{ border: 'none' }}>
            <table className="data">
              <thead>
                <tr><th>Quiz</th><th>Score</th><th>Accuracy</th><th>Time</th><th>When</th><th></th></tr>
              </thead>
              <tbody>
                {attempts?.map((a) => (
                  <tr key={a.id}>
                    <td>{a.quiz.title}</td>
                    <td>{a.correctCount}/{a.total}</td>
                    <td><span className={`badge ${a.percentage >= 70 ? 'badge-green' : a.percentage >= 40 ? 'badge-gold' : 'badge-red'}`}>{a.percentage}%</span></td>
                    <td>{Math.floor((a.timeTakenSec || 0) / 60)}m {(a.timeTakenSec || 0) % 60}s</td>
                    <td>{fmtDateTime(a.submittedAt)}</td>
                    <td><Link className="btn btn-outline btn-sm" to={`/quiz/review/${a.id}`}>Review</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
