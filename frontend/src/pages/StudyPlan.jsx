import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ErrorAlert, PageSpinner, EmptyState, ProgressBar, ServiceNotice } from '../components/ui';
import { fmtDate } from '../utils/format';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function PlanForm({ onCreated }) {
  const [form, setForm] = useState({
    dailyMinutes: 90,
    targetDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [aiOff, setAiOff] = useState(false);

  const toggleDay = (d) => setForm((f) => ({
    ...f,
    days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d],
  }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setAiOff(false);
    try {
      const d = await api.post('/study-plans/generate', {
        dailyMinutes: Number(form.dailyMinutes),
        targetDate: form.targetDate,
        preferredDays: form.days,
      });
      onCreated(d);
    } catch (err) {
      setError(err);
      if (err.code === 'AI_NOT_CONFIGURED') setAiOff(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={submit}>
      <h3>🗓️ Create a personalized study plan</h3>
      <p className="small muted">Based on your remaining syllabus, past performance and availability. Plans persist and tasks can be checked off.</p>
      {aiOff && (
        <ServiceNotice service="AI planning"
          hint="No problem — ZERA fell back to its built-in planner, which schedules your remaining syllabus deterministically. The error above only explains why the AI variant was unavailable." />
      )}
      <ErrorAlert error={aiOff ? null : error} />
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="sp-min">Daily study time (minutes)</label>
          <input id="sp-min" type="number" min={15} max={600} className="input" value={form.dailyMinutes}
            onChange={(e) => setForm((f) => ({ ...f, dailyMinutes: e.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor="sp-date">Target exam date</label>
          <input id="sp-date" type="date" className="input" value={form.targetDate}
            min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
            onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))} required />
        </div>
      </div>
      <div className="field">
        <label>Preferred study days</label>
        <div className="flex" style={{ flexWrap: 'wrap' }}>
          {DAYS.map((d) => (
            <label key={d} className="checkbox-row" style={{ border: '1.5px solid var(--line)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', background: form.days.includes(d) ? 'var(--primary-soft)' : '#fff', borderColor: form.days.includes(d) ? 'var(--primary)' : 'var(--line)' }}>
              <input type="checkbox" checked={form.days.includes(d)} onChange={() => toggleDay(d)} />
              {d}
            </label>
          ))}
        </div>
      </div>
      <button className="btn btn-primary" disabled={busy || !form.days.length}>
        {busy ? 'Building your plan…' : 'Generate study plan'}
      </button>
    </form>
  );
}

export default function StudyPlan() {
  const [plan, setPlan] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = () => {
    api.get('/study-plans/active').then((d) => { setPlan(d.plan); setLoaded(true); }).catch(setError);
  };
  useEffect(load, []);

  const toggleTask = async (taskId) => {
    try {
      await api.post(`/study-plans/tasks/${taskId}/toggle`);
      load();
    } catch (e) {
      setError(e);
    }
  };

  if (!loaded && !error) return <PageSpinner label="Loading your study plan…" />;

  const done = plan ? plan.tasks.filter((t) => t.done).length : 0;
  const byDate = plan ? plan.tasks.reduce((acc, t) => {
    const k = new Date(t.date).toDateString();
    acc[k] = acc[k] || [];
    acc[k].push(t);
    return acc;
  }, {}) : {};

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Study Plan</h1>
          <p className="sub">A realistic schedule built from your syllabus and goals.</p>
        </div>
        {plan && (
          <button className="btn btn-danger btn-sm" onClick={async () => { await api.post(`/study-plans/${plan.id}/abandon`); setPlan(null); }}>
            Abandon plan
          </button>
        )}
      </div>
      <ErrorAlert error={error} />
      {notice && <div className="alert alert-info">{notice}</div>}

      {!plan ? (
        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          <PlanForm onCreated={(d) => { setPlan(d.plan); setNotice(d.aiGenerated ? 'Your AI-personalized plan is ready.' : 'Plan created with the built-in scheduler (AI not configured).'); }} />
          <div className="card">
            <h3>How planning works</h3>
            <ul className="small muted" style={{ paddingLeft: 18 }}>
              <li>ZERA reads your <b>remaining lessons</b> and <b>weak subjects</b> from real data.</li>
              <li>It spreads the work across your preferred days and daily budget.</li>
              <li>Revision days are reserved before your target date.</li>
              <li>Tick tasks as you finish them; the plan completes automatically.</li>
            </ul>
          </div>
        </div>
      ) : (
        <>
          <div className="card mb-12">
            <div className="flex-between">
              <h3 className="mb-0">Active plan</h3>
              <div className="small muted">
                {plan.dailyMinutes} min/day · target {fmtDate(plan.targetDate)} · days: {JSON.parse(plan.preferredDays).join(', ')}
              </div>
            </div>
            <div className="mt-12">
              <ProgressBar value={(done / Math.max(plan.tasks.length, 1)) * 100} green={done === plan.tasks.length} label={`${done}/${plan.tasks.length} tasks done`} />
            </div>
          </div>

          {Object.keys(byDate).length === 0 ? (
            <div className="card"><EmptyState icon="🗓️" title="No tasks scheduled" message="This plan has no tasks. Abandon it and generate a new one." /></div>
          ) : Object.entries(byDate).map(([dateKey, tasks]) => (
            <div className="card mb-12" key={dateKey}>
              <b className="small" style={{ textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--muted)' }}>
                {new Date(dateKey).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
              </b>
              {tasks.map((t) => (
                <div className="list-item" key={t.id}>
                  <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)}
                    style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} aria-label={`Mark "${t.title}" ${t.done ? 'incomplete' : 'complete'}`} />
                  <div className="grow">
                    <div className="t" style={{ textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.55 : 1 }}>{t.title}</div>
                    {t.detail && <div className="s">{t.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
