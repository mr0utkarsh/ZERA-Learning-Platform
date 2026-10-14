import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Doubts() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.doubts.list().then(setConversations).catch(() => setConversations([]));
  useEffect(() => { load(); }, []);

  const ask = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const res = await api.doubts.ask({ question });
      setQuestion('');
      setActive(await api.doubts.get(res.conversationId));
      load();
    } catch (err: any) {
      setError(err.message || 'Could not get an answer.');
    } finally { setBusy(false); }
  };

  const open = async (id: string) => {
    setError('');
    try { setActive(await api.doubts.get(id)); } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-ink-900">AI doubt solver</h1>
      <form onSubmit={ask} className="card space-y-3">
        <textarea className="input min-h-24" placeholder="Ask a question (English or Hindi)…" value={question} onChange={(e) => setQuestion(e.target.value)} required />
        <button className="btn-primary" disabled={busy}>{busy ? 'Thinking…' : 'Ask'}</button>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </form>

      {active && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-ink-900">{active.title || 'Conversation'}</h3>
          {active.messages.map((m: any) => (
            <div key={m.id} className={`rounded-lg p-3 text-sm ${m.sender === 'USER' ? 'bg-slate-100' : 'bg-brand-50 text-ink-800'}`}>
              <div className="text-xs font-medium uppercase text-slate-400">{m.sender === 'USER' ? 'You' : `ZERA${m.provider ? ` · ${m.provider}` : ''}`}</div>
              <p className="mt-1 whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}
        </div>
      )}

      {conversations.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-ink-900">History</h3>
          <div className="mt-2 space-y-1">
            {conversations.map((c) => (
              <button key={c.id} onClick={() => open(c.id)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">
                {c.title || 'Conversation'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
