import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ErrorAlert, PageSpinner, EmptyState, ServiceNotice, Spinner } from '../components/ui';

function ScorePill({ label, value }) {
  return (
    <div className="stat-card" style={{ textAlign: 'center' }}>
      <div className="label">{label}</div>
      <div className="value" style={{ fontSize: 22 }}>{value}<span className="small muted">/10</span></div>
    </div>
  );
}

export default function Interview() {
  const [sessions, setSessions] = useState(null);
  const [setup, setSetup] = useState({ role: '', domain: '', difficulty: 'MEDIUM', rounds: 5 });
  const [session, setSession] = useState(null); // active session state
  const [current, setCurrent] = useState(null); // { exchangeId, question }
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);
  const [aiOff, setAiOff] = useState(false);
  const [finished, setFinished] = useState(null); // { evaluation, summary }
  const [lastEval, setLastEval] = useState(null);

  const loadSessions = () => api.get('/interviews').then((d) => setSessions(d.sessions)).catch(setError);
  useEffect(() => { loadSessions(); }, []);

  const set = (k) => (e) => setSetup((s) => ({ ...s, [k]: e.target.value }));

  const start = async (e) => {
    e.preventDefault();
    setStarting(true);
    setError(null);
    setAiOff(false);
    try {
      const d = await api.post('/interviews/start', { ...setup, rounds: Number(setup.rounds) });
      setSession(d.session);
      setCurrent(d.currentQuestion);
      setFinished(null);
      setLastEval(null);
      setAnswer('');
      loadSessions();
    } catch (err) {
      setError(err);
      if (err.code === 'AI_NOT_CONFIGURED') setAiOff(true);
    } finally {
      setStarting(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const d = await api.post(`/interviews/${session.id}/answer`, { exchangeId: current.exchangeId, answer });
      setLastEval(d.evaluation);
      setAnswer('');
      if (d.finished) {
        setFinished({ summary: d.summary });
        loadSessions();
      } else {
        setCurrent(d.currentQuestion);
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (!sessions && !error) return <PageSpinner label="Loading interviews…" />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>AI Mock Interview</h1>
          <p className="sub">One question at a time — get scored feedback on every answer and a final evaluation.</p>
        </div>
      </div>
      <ErrorAlert error={error} />
      {aiOff && <ServiceNotice service="AI mock interviews" hint="Interviews are fully AI-driven, so they need a configured AI provider." />}

      {!session && (
        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          <form className="card" onSubmit={start}>
            <h3>🎤 Set up your interview</h3>
            <div className="field">
              <label htmlFor="iv-role">Role</label>
              <input id="iv-role" className="input" value={setup.role} onChange={set('role')} placeholder="e.g. Software Engineer, Data Analyst" required />
            </div>
            <div className="field">
              <label htmlFor="iv-domain">Domain</label>
              <input id="iv-domain" className="input" value={setup.domain} onChange={set('domain')} placeholder="e.g. DBMS, Web Development, Java" required />
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label htmlFor="iv-diff">Difficulty</label>
                <select id="iv-diff" className="select" value={setup.difficulty} onChange={set('difficulty')}>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="iv-rounds">Rounds (questions)</label>
                <input id="iv-rounds" type="number" className="input" min={3} max={10} value={setup.rounds} onChange={set('rounds')} />
              </div>
            </div>
            <button className="btn btn-primary" disabled={starting || aiOff}>
              {starting ? 'Starting…' : 'Start interview'}
            </button>
          </form>

          <div className="card">
            <h3>Past interviews</h3>
            {sessions.length === 0 ? (
              <EmptyState icon="🎤" title="No interviews yet" message="Run your first mock interview to get scored feedback." />
            ) : sessions.map((s) => (
              <div className="list-item" key={s.id}>
                <div className="grow">
                  <div className="t">{s.role} · {s.domain}</div>
                  <div className="s">{new Date(s.createdAt).toLocaleDateString()} · {s.status === 'COMPLETED' ? `scored ${s.finalScore}/100` : `in progress (${s.currentRound}/${s.totalRounds})`}</div>
                </div>
                {s.status === 'COMPLETED' ? (
                  <span className={`badge ${s.finalScore >= 70 ? 'badge-green' : s.finalScore >= 40 ? 'badge-gold' : 'badge-red'}`}>{s.finalScore}</span>
                ) : (
                  <button className="btn btn-outline btn-sm" onClick={async () => {
                    const d = await api.get(`/interviews/${s.id}`);
                    const next = d.exchanges.find((x) => !x.answer);
                    if (next) { setSession(d.session); setCurrent({ exchangeId: next.id, question: next.question }); }
                  }}>Resume</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {session && finished && (
        <div className="card" style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 44 }} aria-hidden="true">🏁</div>
          <h2>Interview complete</h2>
          <div className="value" style={{ fontSize: 46, fontWeight: 800, color: 'var(--primary)' }}>{finished.summary.overallScore}<span className="muted" style={{ fontSize: 20 }}>/100</span></div>
          <div className="grid grid-2 mt-20" style={{ textAlign: 'left' }}>
            <div>
              <b className="small">Strengths</b>
              <ul className="small">{finished.summary.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
            <div>
              <b className="small">Improvement areas</b>
              <ul className="small">{finished.summary.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          </div>
          {finished.summary.suggestedTopics?.length > 0 && (
            <>
              <b className="small">Suggested topics to study</b>
              <div className="mb-12">{finished.summary.suggestedTopics.map((t, i) => <span className="chip" key={i}>{t}</span>)}</div>
            </>
          )}
          {finished.summary.notes && <p className="small muted">{finished.summary.notes}</p>}
          <button className="btn btn-primary mt-12" onClick={() => { setSession(null); setFinished(null); }}>Start another interview</button>
        </div>
      )}

      {session && !finished && current && (
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div className="flex-between mb-12">
            <span className="badge">{session.role} · {session.domain} · {session.difficulty}</span>
            <span className="small muted">Round {session.currentRound || 1} of {session.totalRounds}</span>
          </div>

          {lastEval && (
            <div className="card mb-12">
              <b className="small muted">Feedback on your last answer</b>
              <div className="grid grid-4 mt-12">
                <ScorePill label="Technical" value={lastEval.technical} />
                <ScorePill label="Communication" value={lastEval.communication} />
                <ScorePill label="Relevance" value={lastEval.relevance} />
                <ScorePill label="Clarity" value={lastEval.clarity} />
              </div>
              <p className="small mt-12 mb-0">{lastEval.feedback}</p>
            </div>
          )}

          <div className="card">
            <div className="q-num">Interviewer asks</div>
            <div className="q-text" style={{ fontSize: 18 }}>{current.question}</div>
            <textarea className="textarea" rows={6} value={answer} onChange={(e) => setAnswer(e.target.value)}
              placeholder="Answer as you would in a real interview…" aria-label="Your answer" />
            <div className="flex-between mt-12">
              <button className="btn btn-ghost btn-sm" onClick={() => { setSession(null); setCurrent(null); }}>End interview</button>
              <button className="btn btn-primary" onClick={submitAnswer} disabled={busy || !answer.trim()}>
                {busy ? <><Spinner /> Evaluating…</> : 'Submit answer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
