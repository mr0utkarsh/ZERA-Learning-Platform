import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ErrorAlert, PageSpinner, EmptyState, StatCard } from '../components/ui';
import { fmtDate } from '../utils/format';

function ScoreLine({ points }) {
  if (!points.length) return null;
  const w = 560;
  const h = 140;
  const pad = 24;
  const x = (i) => pad + (i * (w - pad * 2)) / Math.max(points.length - 1, 1);
  const y = (v) => h - pad - (v / 100) * (h - pad * 2);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.percentage)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Score trend chart">
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} stroke="#eef0f4" strokeWidth="1" />
          <text x={4} y={y(g) + 4} fontSize="9" fill="#9ca3af">{g}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke="#6c5ce7" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.percentage)} r="4" fill={p.type === 'MOCK_TEST' ? '#00b894' : '#6c5ce7'}>
          <title>{`${p.title} — ${p.percentage}% (${fmtDate(p.date)})`}</title>
        </circle>
      ))}
    </svg>
  );
}

function SubjectBars({ stats }) {
  return (
    <div>
      {stats.map((s) => (
        <div key={s.subject} className="flex mb-12" style={{ marginBottom: 10 }}>
          <span className="small" style={{ width: 170, fontWeight: 600 }}>{s.subject}</span>
          <div className="grow">
            <div className="progress-track">
              <div className={`progress-fill${s.average >= 70 ? ' green' : ''}`} style={{ width: `${s.average}%`, background: s.average < 50 ? '#e17055' : undefined }} />
            </div>
          </div>
          <span className="small muted nowrap" style={{ width: 120, textAlign: 'right' }}>{s.average}% · {s.attempts} try</span>
        </div>
      ))}
    </div>
  );
}

export default function Performance() {
  const [perf, setPerf] = useState(null);
  const [error, setError] = useState(null);

  const load = () => api.get('/performance').then((d) => setPerf(d.performance)).catch(setError);
  useEffect(() => { load(); }, []);

  if (!perf && !error) return <PageSpinner label="Analyzing your performance…" />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Performance</h1>
          <p className="sub">Everything here is computed from your real attempts — no estimates.</p>
        </div>
      </div>
      <ErrorAlert error={error} onRetry={load} />

      {perf && !perf.hasData ? (
        <div className="card">
          <EmptyState icon="📊" title="Not enough data yet"
            message={perf.message}
            actionTo="/quiz" actionLabel="Take a quiz" />
        </div>
      ) : perf && (
        <>
          <div className="grid grid-4" style={{ marginBottom: 18 }}>
            <StatCard label="Overall average" value={`${perf.summary.overallAverage}%`} foot={`${perf.summary.totalAttempts} attempts`} />
            <StatCard label="Quiz average" value={perf.summary.quizAverage !== null ? `${perf.summary.quizAverage}%` : '—'} foot={`${perf.summary.quizAttempts} quizzes`} />
            <StatCard label="Mock test average" value={perf.summary.testAverage !== null ? `${perf.summary.testAverage}%` : '—'} foot={`${perf.summary.testAttempts} tests`} />
            <StatCard
              label="Trend"
              value={perf.summary.trend === null ? '—' : `${perf.summary.trend > 0 ? '+' : ''}${perf.summary.trend}%`}
              foot={perf.summary.trend === null ? 'Need ≥4 attempts' : perf.summary.trend >= 0 ? 'Improving ↑' : 'Needs attention ↓'}
            />
          </div>

          <div className="card mb-12">
            <h3>Score trend <span className="small muted">(violet = quiz, green = mock test)</span></h3>
            <ScoreLine points={perf.timeline} />
          </div>

          <div className="grid grid-2">
            <div className="card">
              <h3>Subject-wise performance</h3>
              <SubjectBars stats={perf.subjectStats} />
            </div>
            <div className="card">
              <h3>Strengths & gaps</h3>
              <b className="small">Strong areas (≥70%)</b>
              <div className="mb-12">
                {perf.strongTopics.length ? perf.strongTopics.map((s) => <span className="chip green" key={s.subject}>{s.subject} · {s.average}%</span>) : <span className="small muted">None yet — keep practicing.</span>}
              </div>
              <b className="small">Weak areas (&lt;60%)</b>
              <div>
                {perf.weakTopics.length ? perf.weakTopics.map((s) => <span className="chip red" key={s.subject}>{s.subject} · {s.average}%</span>) : <span className="small muted">No weak areas detected 🎉</span>}
              </div>
              <hr className="divider" />
              <div className="small muted">
                PYQ practice: {perf.summary.pyqAttempted} attempted, {perf.summary.pyqCorrect} marked correct ·
                Interviews completed: {perf.summary.interviewsCompleted}
                {perf.summary.interviewAverage !== null && <> · avg interview score {perf.summary.interviewAverage}/100</>}
              </div>
            </div>
          </div>

          <div className="card mt-20">
            <h3>Recent attempts</h3>
            <div className="table-wrap" style={{ border: 'none' }}>
              <table className="data">
                <thead><tr><th>When</th><th>What</th><th>Type</th><th>Correct</th><th>%</th></tr></thead>
                <tbody>
                  {[...perf.recent].reverse().map((r) => (
                    <tr key={r.id}>
                      <td>{fmtDate(r.date)}</td>
                      <td>{r.subject}</td>
                      <td><span className="badge badge-gray">{r.type === 'MOCK_TEST' ? 'Mock test' : 'Quiz'}</span></td>
                      <td>{r.correct ?? '—'}/{(r.correct ?? 0) + (r.incorrect ?? 0) || '—'}</td>
                      <td><span className={`badge ${r.percentage >= 70 ? 'badge-green' : r.percentage >= 40 ? 'badge-gold' : 'badge-red'}`}>{r.percentage}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
