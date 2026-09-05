import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { ErrorAlert, PageSpinner, ProgressBar, EmptyState } from '../components/ui';
import { fmtMinutes } from '../utils/format';

function LevelBar({ name, progress, completed, lessonCount, children, depth = 0 }) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = children && children.length > 0;
  return (
    <div style={{ marginBottom: depth === 0 ? 14 : 8 }}>
      <div className="flex" style={{ cursor: hasChildren ? 'pointer' : 'default' }} onClick={() => hasChildren && setOpen(!open)}
        role={hasChildren ? 'button' : undefined} tabIndex={hasChildren ? 0 : undefined}
        onKeyDown={(e) => { if (hasChildren && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(!open); } }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', width: 14 }}>{hasChildren ? (open ? '▼' : '▶') : ''}</span>
        <span style={{ fontWeight: depth === 0 ? 700 : 500, fontSize: depth === 0 ? 15 : 13.5, minWidth: 180 }}>{name}</span>
        <div className="grow" style={{ maxWidth: 420 }}>
          <ProgressBar value={progress} green={progress === 100} showLabel={false} />
        </div>
        <span className="small muted nowrap" style={{ width: 130, textAlign: 'right' }}>{completed}/{lessonCount} lessons</span>
        <span className="badge" style={{ minWidth: 48, justifyContent: 'center' }}>{progress}%</span>
      </div>
      {open && hasChildren && (
        <div style={{ paddingLeft: 22, marginTop: 6 }}>
          {children.map((c) => <LevelBar key={c.id} {...c} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

export default function ProgressPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = () => api.get('/progress').then(setData).catch(setError);
  useEffect(() => { load(); }, []);

  if (!data && !error) return <PageSpinner label="Calculating progress…" />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Progress</h1>
          <p className="sub">Every percentage below is calculated from lessons you actually completed.</p>
        </div>
      </div>
      <ErrorAlert error={error} onRetry={load} />
      {data && (
        <>
          <div className="grid grid-4" style={{ marginBottom: 20 }}>
            <div className="stat-card"><div className="label">Overall completion</div><div className="value">{data.overall.progress}%</div><div className="foot">{data.overall.completedLessons}/{data.overall.totalLessons} lessons</div></div>
            <div className="stat-card"><div className="label">Study streak</div><div className="value">{data.overall.streak}d</div><div className="foot">Consecutive active days</div></div>
            <div className="stat-card"><div className="label">Total study time</div><div className="value">{fmtMinutes(data.overall.studyMinutes)}</div><div className="foot">Recorded on lessons</div></div>
            <div className="stat-card"><div className="label">Courses</div><div className="value">{data.courses.length}</div><div className="foot">In your library</div></div>
          </div>

          {data.courses.filter((c) => c.totalLessons > 0).length === 0 ? (
            <div className="card">
              <EmptyState icon="📈" title="Nothing to track yet"
                message="Once your courses have lessons and you start completing them, your progress tree will grow here."
                actionTo="/courses" actionLabel="Go to courses" />
            </div>
          ) : (
            data.courses.filter((c) => c.totalLessons > 0).map((c) => (
              <div className="card mb-12" key={c.courseId}>
                <div className="flex-between mb-12">
                  <h3 className="mb-0"><Link to={`/courses/${c.courseId}`} style={{ color: 'inherit' }}>{c.name}</Link></h3>
                  <span className="badge">{c.progress}% complete</span>
                </div>
                {c.subjects.map((s) => (
                  <LevelBar key={s.id} name={s.name} progress={s.progress} completed={s.completed} lessonCount={s.lessonCount}
                    children={s.units.map((u) => ({ ...u, children: u.chapters.map((ch) => ({ ...ch, children: ch.topics.map((t) => ({ id: t.id, name: t.name, progress: t.progress, completed: t.completed, lessonCount: t.lessonCount, children: [] })) })) }))} />
                ))}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
