import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Resources() {
  const [resources, setResources] = useState<any[]>([]);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'all' | 'recommended' | 'bookmarks'>('all');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      if (tab === 'recommended') setResources(await api.resources.recommended());
      else setResources(await api.resources.list());
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
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold text-ink-900">Skills & project resources</h1>
      <div className="flex gap-2">
        {(['all', 'recommended', 'bookmarks'] as const).map((t) => (
          <button key={t} className={tab === t ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <input className="input" placeholder="Search resources…" value={q} onChange={(e) => setQ(e.target.value)} />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">No resources found.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((r) => (
            <div key={r.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <a href={r.url} target="_blank" rel="noreferrer noopener" className="font-semibold text-brand-700 hover:underline">{r.title}</a>
                <button onClick={() => toggle(r.id)} aria-label="Bookmark" className={`text-lg ${bookmarked.has(r.id) ? 'text-amber-500' : 'text-slate-300'}`}>★</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1 text-xs">
                <span className="rounded-full bg-slate-100 px-2 py-1">{r.skill}</span>
                <span className="rounded-full bg-slate-100 px-2 py-1">{r.technology}</span>
                <span className="rounded-full bg-slate-100 px-2 py-1">{r.level}</span>
                {r.verified && <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">verified</span>}
              </div>
              {r.description && <p className="mt-2 text-sm text-slate-600">{r.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
