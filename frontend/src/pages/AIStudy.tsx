import { useEffect, useRef, useState } from 'react';
import { Logo } from '../components/Logo';
import { Sparkles, MessageCircle, Bot, AlertCircle } from 'lucide-react';

const SUGGESTED_PROMPTS = [
  'Explain this simply',
  'Give me an example',
  'Quiz me',
  'Make a revision plan',
  'Break this topic into steps',
];

export default function AIStudy() {
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; loading?: boolean; id?: string }[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const aiConfigured = Boolean(import.meta.env.VITE_API_URL);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setError('');

    const userMsg = { role: 'user' as const, content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    if (!aiConfigured) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'AI support is being configured. Connect a provider to start chatting.' }]);
      return;
    }

    setBusy(true);
    const loadingId = Date.now();
    setMessages((prev) => [...prev, { role: 'assistant', content: '', loading: true, id: String(loadingId) }]);

    try {
      await new Promise((r) => setTimeout(r, 800));
      setMessages((prev) => prev.map((m) => (m.id === String(loadingId) ? { ...m, content: `I can help with "${topic || 'your topic'}". The AI backend is not yet configured, so this is a placeholder response.` } : m)));
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === String(loadingId) ? { ...m, content: 'Something went wrong. Please try again.' } : m)));
      setError('Could not get a response.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-void text-fg">
      <div className="container max-w-4xl mx-auto px-6 py-12 md:py-20">
        <nav className="mb-8">
          <Logo variant="primary" className="h-9" showWordmark />
        </nav>

        <div className="flex items-center gap-4 mb-12">
          <Sparkles className="h-5 w-5 text-violet-300 shrink-0" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-fg">AI Study Support</h1>
        </div>

        <p className="text-lg text-muted mb-12 leading-relaxed max-w-2xl">
          Your AI study assistant. Ask for simple explanations, examples, quizzes, revision plans
          or step-by-step topic breakdowns. Select a subject and topic for better context.
        </p>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div>
            <label className="field-label">Subject</label>
            <input className="field-input" placeholder="e.g. Database Systems" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Topic / concept</label>
            <input className="field-input" placeholder="e.g. Normalisation" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button className="btn-soft px-4 py-3">Set context</button>
          </div>
        </div>

        <div className="card-lift zera-card p-6 mb-8 min-h-[400px] max-h-[60vh] overflow-y-auto flex flex-col gap-4" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
              <MessageCircle className="h-12 w-12 text-muted mb-3" />
              <p className="text-sm text-muted">Start a conversation below</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`rounded-2xl p-3.5 max-w-[80%] text-sm leading-relaxed ${m.role === 'user' ? 'bg-violet-500/10 text-fg border border-violet-500/20' : 'bg-surface-2 text-fg border border-white/5'}`}>
                {m.content}
                {m.loading && <span className="block mt-2 h-1 w-12 rounded-full bg-surface-3 animate-pulse" />}
              </div>
            </div>
          ))}
          {busy && messages[messages.length - 1]?.loading && (
            <div className="flex gap-3">
              <div className="rounded-2xl p-3.5 max-w-[80%] bg-surface-2 text-fg border border-white/5 text-sm">
                <div className="h-4 w-24 rounded-full bg-white/5 animate-pulse mb-2" />
                <div className="h-4 w-16 rounded-full bg-white/5 animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 px-4 py-3 ring-1 ring-red-500/20 text-sm text-error flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!aiConfigured && (
          <div className="mb-8 rounded-xl bg-surface-2 p-5 ring-1 ring-white/5 border border-white/5">
            <div className="flex items-start gap-3">
              <Bot className="h-5 w-5 text-muted shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-fg">AI support is being configured</p>
                <p className="text-xs text-muted mt-1">Set VITE_API_URL and implement /api/ai/chat on the backend to enable real AI responses.</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            className="field-input flex-1"
            placeholder="Ask your AI study assistant…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <button className="btn-primary px-6 py-3" disabled={busy}>
            {busy ? 'Sending…' : 'Send'}
          </button>
        </form>

        <div className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Suggested prompts</p>
          <div className="flex gap-2 flex-wrap">
            {SUGGESTED_PROMPTS.map((p, i) => (
              <button key={i} className="btn-soft text-sm" onClick={() => setInput(p)}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}