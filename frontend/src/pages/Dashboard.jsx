import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { ErrorAlert, PageSpinner, StatCard, ProgressBar, EmptyState } from '../components/ui';
import { timeAgo, fmtMinutes } from '../utils/format';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    api.get('/progress/dashboard')
      .then((d) => setData(d.dashboard))
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading) return <PageSpinner label="Loading your dashboard…" />;

  return (
    <div className="page">
      <ErrorAlert error={error} onRetry={load} />
      {data && !error && (
        <>
          <div className="page-head">
            <div>
              <h1>Welcome back, {data.welcome.name.split(' ')[0]} 👋</h1>
              <p className="sub">Here’s where your learning stands today.</p>
            </div>
            <Link to="/courses" className="btn btn-primary">Continue learning</Link>
          </div>

          <div className="grid grid-4 mb-12" style={{ marginBottom: 18 }}>
            <StatCard label="Overall progress" value={`${data.overallProgress}%`} foot={`${data.completedLessons} of ${data.totalLessons} lessons`} />
            <StatCard label="Study streak" value={`${data.streak} ${data.streak === 1 ? 'day' : 'days'}`} foot="Keep it going 🔥" />
            <StatCard label="Study time" value={fmtMinutes(data.studyMinutes)} foot="Total recorded" />
            <StatCard
              label="Quiz average"
              value={data.quizPerformance.average !== null ? `${data.quizPerformance.average}%` : '—'}
              foot={data.quizPerformance.attempts.length ? `${data.quizPerformance.attempts.length} recent quizzes` : 'No quizzes yet'}
            />
          </div>

          {/* Continue learning */}
          <div className="card mb-12">
            <div className="flex-between">
              <h3 className="mb-0">Continue learning</h3>
            </div>
            {data.continueLearning ? (
              <div className="flex mt-12" style={{ alignItems: 'flex-start' }}>
                <div className="grow">
                  <div className="t" style={{ fontWeight: 600 }}>{data.continueLearning.nextLesson.title}</div>
                  <div className="small muted">
                    {data.continueLearning.nextLesson.topic?.name} · {data.continueLearning.nextLesson.topic?.chapter?.name} — {data.continueLearning.name}
                  </div>
                  <div className="mt-12" style={{ marginTop: 10, maxWidth: 340 }}>
                    <ProgressBar value={data.continueLearning.progress} label={data.continueLearning.name} />
                  </div>
                </div>
                <Link className="btn btn-primary" to={`/lessons/${data.continueLearning.nextLesson.id}`}>Resume</Link>
              </div>
            ) : (
              <p className="muted mt-12 mb-0">
                Nothing to continue yet — {data.courses.length ? 'all your lessons are complete or your courses have no lessons yet.' : 'add your first course to begin.'}{' '}
                <Link to="/courses">Go to courses</Link>
              </p>
            )}
          </div>

          <div className="grid grid-2">
            {/* Courses */}
            <div className="card">
              <div className="flex-between mb-12">
                <h3 className="mb-0">Your courses</h3>
                <Link to="/courses" className="small">View all</Link>
              </div>
              {data.courses.length === 0 ? (
                <EmptyState icon="📚" title="No courses yet"
                  message="Upload your syllabus or create a course to get started."
                  actionTo="/courses" actionLabel="Set up a course" />
              ) : data.courses.map((c) => (
                <div className="list-item" key={c.id}>
                  <div className="grow">
                    <Link to={`/courses/${c.id}`} className="t" style={{ color: 'inherit' }}>{c.name}</Link>
                    <div className="s">{c.completedLessons}/{c.totalLessons} lessons</div>
                  </div>
                  <div style={{ width: 130 }}>
                    <ProgressBar value={c.progress} green={c.progress === 100} />
                  </div>
                  <span className="badge">{c.progress}%</span>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            <div className="card">
              <h3>Recommended for you</h3>
              {data.recommendations.length === 0 ? (
                <p className="muted mb-0">Nothing to suggest right now — keep studying!</p>
              ) : data.recommendations.map((r, i) => (
                <div className="list-item" key={i}>
                  <span aria-hidden="true" style={{ fontSize: 20 }}>
                    {{ SETUP: '📤', STUDY: '📖', QUIZ: '❓', PLAN: '🗓️' }[r.type] || '💡'}
                  </span>
                  <div className="grow">
                    <div className="t">{r.title}</div>
                    <div className="s">{r.detail}</div>
                  </div>
                  <Link className="btn btn-outline btn-sm" to={
                    r.type === 'SETUP' ? '/courses' : r.type === 'QUIZ' ? '/quiz' : r.type === 'PLAN' ? '/study-plan' : '/courses'
                  }>Open</Link>
                </div>
              ))}
            </div>

            {/* Quiz performance */}
            <div className="card">
              <div className="flex-between mb-12">
                <h3 className="mb-0">Recent quiz performance</h3>
                <Link to="/performance" className="small">Analytics</Link>
              </div>
              {data.quizPerformance.attempts.length === 0 ? (
                <EmptyState icon="❓" title="No quizzes yet"
                  message="Generate your first quiz to start tracking accuracy."
                  actionTo="/quiz" actionLabel="Generate a quiz" />
              ) : data.quizPerformance.attempts.map((a) => (
                <div className="list-item" key={a.id}>
                  <div className="grow">
                    <div className="t">{a.title}</div>
                    <div className="s">{timeAgo(a.submittedAt)}</div>
                  </div>
                  <span className={`badge ${a.percentage >= 70 ? 'badge-green' : a.percentage >= 40 ? 'badge-gold' : 'badge-red'}`}>
                    {a.percentage}%
                  </span>
                </div>
              ))}
            </div>

            {/* Activity + upcoming */}
            <div className="card">
              <h3>Recent activity</h3>
              {data.recentActivity.length === 0 && data.upcomingTasks.length === 0 ? (
                <p className="muted mb-0">No activity yet — complete a lesson or quiz and it will show up here.</p>
              ) : (
                <>
                  {data.recentActivity.slice(0, 5).map((a) => (
                    <div className="list-item" key={a.id}>
                      <span aria-hidden="true">🕘</span>
                      <div className="grow">
                        <div className="t" style={{ fontWeight: 500 }}>{a.message}</div>
                        <div className="s">{timeAgo(a.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                  {data.upcomingTasks.length > 0 && (
                    <>
                      <div className="side-section" style={{ padding: '14px 0 6px' }}>Upcoming study tasks</div>
                      {data.upcomingTasks.map((t) => (
                        <div className="list-item" key={t.id}>
                          <span aria-hidden="true">🗓️</span>
                          <div className="grow">
                            <div className="t" style={{ fontWeight: 500 }}>{t.title}</div>
                            <div className="s">{new Date(t.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
