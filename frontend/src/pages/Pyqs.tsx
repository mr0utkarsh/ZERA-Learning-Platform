import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Pyqs() {
  const [pyqs, setPyqs] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { api.pyqs.list().then(setPyqs).catch((e) => setError(e.message)); }, []);

  const filtered = pyqs.filter((p) =>
    !q || (p.title || '').toLowerCase().includes(q.toLowerCase()) || (p.subject || '').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold text-fg">Previous year questions</h1>
      <p className="text-sm text-slate-500">Verified previous-year papers are listed as-is. AI-generated practice questions are labelled separately and are never presented as historical papers.</p>
      <input className="input" placeholder="Search by title or subject…" value={q} onChange={(e) => setQ(e.target.value)} />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {filtered.length === 0 ? (
        <div className="card text-center">
          <p className="text-sm text-slate-500">No previous-year papers available yet. Administrators can upload verified papers from the admin panel.</p>
        </div>
      ) : (
        <div className="card divide-y divide-white/5">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium text-fg">{p.title}</div>
                <div className="text-sm text-slate-500">{p.subject}{p.year ? ` · ${p.year}` : ''}{p.semester ? ` · ${p.semester}` : ''}</div>
              </div>
              {p.fileUrl && (
                <a className="btn-ghost" href={p.fileUrl} target="_blank" rel="noreferrer noopener">View</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
