import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { ErrorAlert, PageSpinner, EmptyState } from '../../components/ui';

export default function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const load = () => api.get('/admin/stats').then((d) => setStats(d.stats)).catch(setError);
  useEffect(() => { load(); }, []);

  if (!stats && !error) return <PageSpinner label="Loading analytics…" />;

  const rows = stats ? [
    ['Courses created', stats.totalCourses],
    ['Quiz attempts (completed)', stats.quizAttempts],
    ['Mock test attempts (completed)', stats.testAttempts],
    ['AI notes generated', stats.notesGenerated],
    ['Mock interviews completed', stats.interviewsCompleted],
    ['Activities in last 24h', stats.activeLast24h],
  ] : [];
  const max = Math.max(...rows.map((r) => r[1]), 1);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Analytics</h1>
          <p className="sub">Platform-wide activity, straight from the database.</p>
        </div>
      </div>
      <ErrorAlert error={error} onRetry={load} />
      {stats && (
        stats.totalStudents === 0 ? (
          <div className="card"><EmptyState icon="📈" title="No data yet" message="Analytics appear once students start using the platform." /></div>
        ) : (
          <div className="card">
            <h3>Platform activity</h3>
            {rows.map(([label, value]) => (
              <div className="flex mb-12" key={label} style={{ marginBottom: 10 }}>
                <span className="small" style={{ width: 260, fontWeight: 500 }}>{label}</span>
                <div className="grow">
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${(value / max) * 100}%` }} />
                  </div>
                </div>
                <b style={{ width: 70, textAlign: 'right' }}>{value}</b>
              </div>
            ))}
            <p className="small muted mb-0">Counts are exact database aggregates — nothing is sampled or estimated.</p>
          </div>
        )
      )}
    </div>
  );
}
