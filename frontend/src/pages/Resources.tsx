import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { api } from '../lib/api';
import { Search, FileText, ExternalLink } from 'lucide-react';

export default function Resources() {
  const [resources, setResources] = useState<any[]>([]);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'all' | 'recommended' | 'bookmarks'>('all');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      if (tab === 'recommended') setResources(await api.resources.recommended().catch(() => []));
      else setResources(await api.resources.list().catch(() => []));
      const b = await api.resources.bookmarks().catch(() => []);
      setBookmarked(new Set(b.map((x: any) => x.resourceId)));
    } catch (e: any) { setError(e.message); }
  };
  useEffect(() => { load(); }, [tab]);

  const toggle = async (id: string) => {
    await api.resources.bookmark(id).catch(() => null);
    load();
  };

  const filtered = resources.filter((r) =>
    !q || r.title.toLowerCase().includes(q.toLowerCase()) || (r.skill || '').toLowerCase().includes(q.toLowerCase()) || (r.technology || '').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-void text-fg">
      <div className="container max-w-5xl mx-auto px-6 py-12 md:py-20">
        <nav className="mb-12">
          <Link to="/" className="btn-ghost mb-2 inline-flex items-center gap-2 text-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/><path d="M19 12H5"/></svg>
            Back to home
          </Link>
        </nav>

        <div className="flex items-center gap-4 mb-8">
          <Logo variant="primary" className="h-10" showWordmark />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-fg">
            Resources
          </h1>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted" />
            <input className="field-input pl-9" placeholder="Search resources…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {(['all', 'recommended', 'bookmarks'] as const).map((t) => (
              <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="form-error mb-6">{error}</div>}

        {filtered.length === 0 ? (
          <div className="empty-state mb-8">
            <div className="empty-state-icon"><FileText className="h-6 w-6" /></div>
            <h3 className="empty-state-title">No resources found</h3>
            <p className="empty-state-desc">Try adjusting your search or switch categories.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {filtered.map((r) => (
              <div key={r.id} className="card-lift zera-card-hover p-5 group">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <a href={r.url} target="_blank" rel="noreferrer noopener" className="font-semibold text-fg hover:text-violet-300 transition-colors">{r.title}</a>
                  <button onClick={() => toggle(r.id)} aria-label="Bookmark" className={`text-lg ${bookmarked.has(r.id) ? 'text-amber-500' : 'text-muted'}`}>★</button>
                </div>
                <div className="mb-3 flex flex-wrap gap-1 text-xs">
                  <span className="rounded-full bg-surface-3 px-2 py-1 text-xs text-muted">{r.skill}</span>
                  <span className="rounded-full bg-surface-3 px-2 py-1 text-xs text-muted">{r.technology}</span>
                  <span className="rounded-full bg-surface-3 px-2 py-1 text-xs text-muted">{r.level}</span>
                  {r.verified && <span className="rounded-full bg-violet-500/10 px-2 py-1 text-xs text-violet-300">verified</span>}
                </div>
                {r.description && <p className="mt-2 text-sm text-muted leading-relaxed">{r.description}</p>}
                <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span>Open external resource</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
