import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { ErrorAlert, PageSpinner, StatCard } from '../../components/ui';
import { fmtDate } from '../../utils/format';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const load = () => api.get('/admin/stats').then((d) => setStats(d.stats)).catch(setError);
  useEffect(() => { load(); }, []);

  if (!stats && !error) return <PageSpinner label="Loading statistics…" />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Admin dashboard</h1>
          <p className="sub">Live system statistics from the database.</p>
        </div>
        <Link to="/admin/students" className="btn btn-primary">Manage students</Link>
      </div>
      <ErrorAlert error={error} onRetry={load} />
      {stats && (
        <>
          <div className="grid grid-4" style={{ marginBottom: 18 }}>
            <StatCard label="Total students" value={stats.totalStudents} />
            <StatCard label="Active students" value={stats.activeStudents} />
            <StatCard label="Suspended" value={stats.suspendedStudents} />
            <StatCard label="Active last 24h" value={stats.activeLast24h} foot="Any recorded activity" />
          </div>
          <div className="grid grid-4" style={{ marginBottom: 18 }}>
            <StatCard label="Courses" value={stats.totalCourses} />
            <StatCard label="Quiz attempts" value={stats.quizAttempts} foot="Completed" />
            <StatCard label="Mock test attempts" value={stats.testAttempts} foot="Completed" />
            <StatCard label="Notes generated" value={stats.notesGenerated} />
          </div>

          <div className="grid grid-2">
            <div className="card">
              <h3>Recent signups</h3>
              {stats.recentSignups.length === 0 ? <p className="muted mb-0">No students yet.</p> : stats.recentSignups.map((s) => (
                <div className="list-item" key={s.id}>
                  <div className="grow">
                    <div className="t">{s.name}</div>
                    <div className="s">{s.email}</div>
                  </div>
                  <span className="small muted">{fmtDate(s.createdAt)}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <h3>System status</h3>
              <div className="list-item"><span className="grow t" style={{ fontWeight: 500 }}>Completed interviews</span><b>{stats.interviewsCompleted}</b></div>
              <div className="list-item"><span className="grow t" style={{ fontWeight: 500 }}>Courses in the system</span><b>{stats.totalCourses}</b></div>
              <p className="small muted mt-12 mb-0">
                Statistics are computed on request from live database counts — there is no caching or estimation.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
