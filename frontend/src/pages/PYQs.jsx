import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import Markdown from '../components/Markdown';
import { ErrorAlert, PageSpinner, EmptyState, Modal, Spinner } from '../components/ui';

function PyqCard({ p, refresh }) {
  const [expanded, setExpanded] = useState(false);
  const [answer, setAnswer] = useState('');
  const [selfCorrect, setSelfCorrect] = useState(null);
  const [busy, setBusy] = useState(false);
  const [solution, setSolution] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [explainBusy, setExplainBusy] = useState(false);
  const [explainErr, setExplainErr] = useState(null);

  const submitAttempt = async (correct) => {
    if (!answer.trim()) return;
    setBusy(true);
    try {
      const d = await api.post(`/pyqs/${p.id}/attempt`, { answer, correct });
      setSolution(d.solution);
      setSelfCorrect(correct);
      refresh();
    } catch (e) {
      setExplainErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const getExplanation = async () => {
    setExplainBusy(true);
    setExplainErr(null);
    try {
      const d = await api.post(`/pyqs/${p.id}/explain`);
      setExplanation(d.explanation);
    } catch (e) {
      setExplainErr(e.message);
    } finally {
      setExplainBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="flex-between">
        <div className="flex" style={{ flexWrap: 'wrap', gap: 6 }}>
          <span className="badge">{p.subjectName}</span>
          <span className="badge badge-gray">{p.year}</span>
          {p.exam && <span className="badge badge-gray">{p.exam}</span>}
          {p.topic && <span className="badge badge-gray">{p.topic}</span>}
          <span className={`badge ${p.difficulty === 'HARD' ? 'badge-red' : p.difficulty === 'EASY' ? 'badge-green' : 'badge-gold'}`}>{p.difficulty}</span>
        </div>
        <div className="flex">
          {p.attempted && (
            <span className={`badge ${p.lastCorrect ? 'badge-green' : 'badge-red'}`}>
              {p.lastCorrect ? '✓ Got it right' : '✗ Missed'}
            </span>
          )}
          <button className="btn btn-ghost btn-sm" aria-label={p.bookmarked ? 'Remove bookmark' : 'Bookmark'}
            onClick={async () => { await api.post(`/pyqs/${p.id}/bookmark`); refresh(); }}>
            {p.bookmarked ? '★' : '☆'}
          </button>
        </div>
      </div>
      <p style={{ marginTop: 12, marginBottom: 8, fontWeight: 500 }}>{p.question}</p>

      {!expanded ? (
        <button className="btn btn-outline btn-sm" onClick={() => { setExpanded(true); setAnswer(p.lastAnswer || ''); }}>
          {p.attempted ? 'Practiced — open again' : 'Practice this question'}
        </button>
      ) : (
        <div className="mt-12">
          {p.attempted && selfCorrect === null && (
            <div className="alert alert-info">You attempted this before. Write a fresh answer, then grade yourself against the solution.</div>
          )}
          <textarea className="textarea" rows={4} value={answer} onChange={(e) => setAnswer(e.target.value)}
            placeholder="Write your answer…" aria-label="Your answer" />
          <div className="flex mt-12">
            <button className="btn btn-primary btn-sm" onClick={() => submitAttempt(true)} disabled={busy || !answer.trim()}>I solved it ✓</button>
            <button className="btn btn-outline btn-sm" onClick={() => submitAttempt(false)} disabled={busy || !answer.trim()}>I couldn’t solve it</button>
            {solution === null && p.attempted && (
              <button className="btn btn-ghost btn-sm" onClick={async () => {
                try { const d = await api.get(`/pyqs/${p.id}/solution`); setSolution(d.solution); }
                catch (e) { setExplainErr(e.message); }
              }}>Show solution</button>
            )}
          </div>
          {solution && (
            <div className="alert alert-success" style={{ marginTop: 12 }}>
              <div style={{ width: '100%' }}>
                <b>Solution</b>
                <Markdown text={solution} />
              </div>
            </div>
          )}
          <div className="flex mt-12">
            <button className="btn btn-outline btn-sm" onClick={getExplanation} disabled={explainBusy}>
              {explainBusy ? 'Asking AI…' : '🤖 Get AI explanation'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(false)}>Close</button>
          </div>
          {explainErr && <div className="alert alert-warn" style={{ marginTop: 10 }}>{explainErr}</div>}
          {explainBusy && <div className="mt-12"><Spinner /> Working…</div>}
          {explanation && (
            <div className="card card-tight mt-12" style={{ background: 'var(--primary-soft)', borderColor: 'var(--primary-border)' }}>
              <Markdown text={explanation} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PYQs() {
  const [filters, setFilters] = useState({ subject: '', year: '', topic: '', difficulty: '', bookmarked: false });
  const [data, setData] = useState(null);
  const [bookmarks, setBookmarks] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filters.subject) params.set('subject', filters.subject);
    if (filters.year) params.set('year', filters.year);
    if (filters.topic) params.set('topic', filters.topic);
    if (filters.difficulty) params.set('difficulty', filters.difficulty);
    api.get(`/pyqs?${params.toString()}`).then(setData).catch(setError).finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line
  useEffect(() => {
    api.get('/pyqs/bookmarks').then((d) => setBookmarks(d.bookmarks)).catch(() => {});
  }, [data]);

  const list = filters.bookmarked
    ? (bookmarks || []).map((b) => ({ ...b, attempted: false, bookmarked: true, difficulty: 'MEDIUM' }))
    : data?.pyqs || [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Previous Year Questions</h1>
          <p className="sub">Practice real exam questions. Solutions unlock after you attempt.</p>
        </div>
      </div>
      <ErrorAlert error={error} onRetry={load} />

      <div className="card card-tight mb-12" style={{ marginBottom: 16 }}>
        <div className="grid grid-4" style={{ gap: 10 }}>
          <input className="input" placeholder="Subject" value={filters.subject} onChange={(e) => setFilters((f) => ({ ...f, subject: e.target.value }))} aria-label="Filter by subject" />
          <input className="input" placeholder="Year (e.g. 2023)" inputMode="numeric" value={filters.year} onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value.replace(/\D/g, '') }))} aria-label="Filter by year" />
          <input className="input" placeholder="Topic" value={filters.topic} onChange={(e) => setFilters((f) => ({ ...f, topic: e.target.value }))} aria-label="Filter by topic" />
          <select className="select" value={filters.difficulty} onChange={(e) => setFilters((f) => ({ ...f, difficulty: e.target.value }))} aria-label="Filter by difficulty">
            <option value="">Any difficulty</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
        <div className="flex mt-12">
          <button className="btn btn-primary btn-sm" onClick={load}>Search</button>
          <label className="checkbox-row">
            <input type="checkbox" checked={filters.bookmarked} onChange={(e) => setFilters((f) => ({ ...f, bookmarked: e.target.checked }))} />
            Bookmarked only
          </label>
          {data && !filters.bookmarked && <span className="small muted">{data.total} question(s) found</span>}
        </div>
      </div>

      {loading ? <PageSpinner label="Searching…" /> : list.length === 0 ? (
        <div className="card">
          <EmptyState icon="🗂️" title={filters.bookmarked ? 'No bookmarks yet' : 'No questions found'}
            message={filters.bookmarked ? 'Bookmark questions with ☆ to find them here later.' : 'Try different filters — the question bank is seeded with a small development sample.'} />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {list.map((p) => <PyqCard key={p.id} p={p} refresh={load} />)}
        </div>
      )}
    </div>
  );
}
