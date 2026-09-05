import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import Markdown from '../components/Markdown';
import { ErrorAlert, EmptyState, ServiceNotice, Spinner } from '../components/ui';

export default function DoubtSolver() {
  const location = useLocation();
  const initialContext = location.state?.context || null;

  const [conversations, setConversations] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [aiOff, setAiOff] = useState(false);
  const scrollRef = useRef(null);

  const loadList = () => api.get('/doubts/conversations').then((d) => setConversations(d.conversations)).catch(setError);
  useEffect(() => { loadList(); }, []);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    api.get(`/doubts/conversations/${activeId}`)
      .then((d) => setMessages(d.messages))
      .catch(setError);
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  const send = async (e) => {
    e?.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    setAiOff(false);
    setMessages((m) => [...m, { role: 'USER', content: q, createdAt: new Date().toISOString() }]);
    setQuestion('');
    try {
      const d = await api.post('/doubts/ask', { question: q, conversationId: activeId || undefined, context: initialContext || undefined });
      setActiveId(d.conversationId);
      setMessages((m) => [...m, d.message]);
      loadList();
    } catch (err) {
      setError(err);
      if (err.code === 'AI_NOT_CONFIGURED') setAiOff(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>AI Doubt Solver</h1>
          <p className="sub">Ask anything — the tutor explains step by step, with examples and follow-up questions.</p>
        </div>
        {conversations?.length > 0 && (
          <button className="btn btn-outline" onClick={() => { setActiveId(null); setMessages([]); }}>+ New conversation</button>
        )}
      </div>

      {aiOff && <ServiceNotice service="The AI tutor" />}
      <ErrorAlert error={error} />

      <div className="grid" style={{ gridTemplateColumns: '240px 1fr', alignItems: 'stretch' }}>
        {/* History */}
        <div className="card card-tight" style={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
          <b className="small muted">History</b>
          {!conversations ? <div className="mt-12"><Spinner /></div> : conversations.length === 0 ? (
            <p className="small muted mt-12 mb-0">No conversations yet.</p>
          ) : conversations.map((c) => (
            <div key={c.id} className="flex-between" style={{ padding: '8px 4px', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer' }}
              onClick={() => setActiveId(c.id)}>
              <span className="small" style={{
                fontWeight: activeId === c.id ? 700 : 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170,
                color: activeId === c.id ? 'var(--primary-dark)' : 'var(--ink-2)',
              }}>
                {c.title}
              </span>
              <button className="btn btn-ghost btn-sm" aria-label="Delete conversation"
                onClick={async (e) => { e.stopPropagation(); await api.delete(`/doubts/conversations/${c.id}`); if (activeId === c.id) setActiveId(null); loadList(); }}>
                🗑
              </button>
            </div>
          ))}
        </div>

        {/* Chat */}
        <div className="card">
          {initialContext && !activeId && (
            <div className="alert alert-info">Asking in context: <b>{initialContext}</b></div>
          )}
          <div className="chat-wrap">
            <div className="chat-scroll" ref={scrollRef}>
              {messages.length === 0 && !busy && (
                <EmptyState icon="💬" title="Ask your first doubt"
                  message={'Try: “What is normalization in DBMS?” or “Explain deadlock with an example.”'} />
              )}
              {messages.map((m, i) => (
                <div className={`msg ${m.role === 'USER' ? 'user' : 'ai'}`} key={m.id || i}>
                  {m.role === 'USER' ? m.content : <Markdown text={m.content} />}
                </div>
              ))}
              {busy && (
                <div className="msg ai"><span className="flex"><Spinner /> Thinking…</span></div>
              )}
            </div>
            <form className="chat-input" onSubmit={send}>
              <textarea
                className="textarea"
                placeholder="Type your doubt… (Enter to send, Shift+Enter for a new line)"
                value={question}
                aria-label="Your question"
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                disabled={aiOff}
              />
              <button className="btn btn-primary" disabled={busy || !question.trim() || aiOff}>Send</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
