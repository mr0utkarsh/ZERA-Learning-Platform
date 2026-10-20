import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Notes() {
  const [notes, setNotes] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Personal');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = () => api.notes.list().then(setNotes).catch(() => setNotes([]));
  useEffect(() => { load(); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) await api.notes.update(editingId, { title, content });
      else await api.notes.create({ title, content, category });
      setTitle(''); setContent(''); setEditingId(null);
      load();
    } catch (err: any) { setError(err.message); }
  };

  const edit = (note: any) => { setEditingId(note.id); setTitle(note.title); setContent(note.content); };
  const remove = async (id: string) => { await api.notes.remove(id).catch(() => null); load(); };

  const filtered = notes.filter((n) =>
    !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold text-fg">Notes</h1>
      <form onSubmit={submit} className="card space-y-3">
        <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea className="input min-h-32" placeholder="Write your note…" value={content} onChange={(e) => setContent(e.target.value)} required />
        <div className="flex gap-2">
          <input className="input max-w-40" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
          <button className="btn-primary">{editingId ? 'Update note' : 'Add note'}</button>
          {editingId && <button type="button" className="btn-ghost" onClick={() => { setEditingId(null); setTitle(''); setContent(''); }}>Cancel</button>}
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-error ring-1 ring-red-500/20">{error}</p>}
      </form>

      <input className="input" placeholder="Search notes…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">No notes yet.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((n) => (
            <div key={n.id} className="card">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-fg">{n.title}</h3>
                <div className="flex gap-1">
                  <button className="btn-ghost px-2 py-1 text-xs" onClick={() => edit(n)}>Edit</button>
                  <button className="btn-ghost px-2 py-1 text-xs" onClick={() => remove(n.id)}>Delete</button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{n.content.slice(0, 300)}{n.content.length > 300 ? '…' : ''}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
