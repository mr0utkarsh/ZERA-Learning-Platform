import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { ErrorAlert, PageSpinner, EmptyState } from '../components/ui';
import { QuizGeneratorForm } from './Quiz';
import { fmtDateTime, fmtDuration } from '../utils/format';

export default function MockTest() {
  const [tests, setTests] = useState(null);
  const [attempts, setAttempts] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setError(null);
    api.get('/quizzes?type=MOCK_TEST').then((d) => setTests(d.quizzes)).catch(setError);
    api.get('/quizzes/attempts?type=MOCK_TEST').then((d) => setAttempts(d.attempts)).catch(() => {});
  };
  useEffect(load, []);

  if (!tests && !error) return <PageSpinner label="Loading mock tests…" />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Mock Tests</h1>
          <p className="sub">Full-length timed tests. Answers stay hidden until you submit.</p>
        </div>
      </div>
      <ErrorAlert error={error} onRetry={load} />

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <QuizGeneratorForm type="MOCK_TEST" />
        <div className="card">
          <h3>Your mock tests</h3>
          {tests && tests.length === 0 ? (
            <EmptyState icon="📝" title="No mock tests yet" message="Generate a timed mock test and simulate real exam pressure." />
          ) : tests.map((t) => (
            <div className="list-item" key={t.id}>
              <div className="grow">
                <div className="t">{t.title}</div>
                <div className="s">{t.questionCount} questions · ⏱ {t.timeLimitMin} min · {fmtDateTime(t.createdAt)}</div>
              </div>
              <Link className="btn btn-primary btn-sm" to={`/tests/run/${t.id}`}>Start</Link>
              <button className="btn btn-ghost btn-sm" aria-label={`Delete ${t.title}`}
                onClick={async () => { await api.delete(`/quizzes/${t.id}`); load(); }}>🗑</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt-20">
        <h3>Attempt history</h3>
        {attempts && attempts.length === 0 ? (
          <p className="muted mb-0">No mock test attempts yet.</p>
        ) : (
          <div className="table-wrap" style={{ border: 'none' }}>
            <table className="data">
              <thead><tr><th>Test</th><th>Score</th><th>%</th><th>Time</th><th>When</th><th></th></tr></thead>
              <tbody>
                {attempts?.map((a) => (
                  <tr key={a.id}>
                    <td>{a.quiz.title}</td>
                    <td>{a.correctCount}/{a.total}</td>
                    <td><span className={`badge ${a.percentage >= 70 ? 'badge-green' : a.percentage >= 40 ? 'badge-gold' : 'badge-red'}`}>{a.percentage}%</span></td>
                    <td>{fmtDuration(a.timeTakenSec)}</td>
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
