import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Handwriting() {
  const [notes, setNotes] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState<any>(null);
  const [corrected, setCorrected] = useState('');

  const load = () => api.handwriting.list().then(setNotes).catch(() => setNotes([]));
  useEffect(() => { load(); }, []);

  const upload = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const form = new FormData();
      if (!file) throw new Error('Choose an image or scan first.');
      form.append('file', file, file.name);
      const created = await api.handwriting.upload(form);
      setActive(created); setCorrected(created.correctedText || '');
      setFile(null);
      load();
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  const save = async () => {
    if (!active) return;
    await api.handwriting.correct(active.id, corrected).catch(() => null);
    setActive({ ...active, correctedText: corrected });
    load();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-ink-900">AI handwritten notes</h1>
      <form onSubmit={upload} className="card space-y-3">
        <p className="text-sm text-slate-500">Upload a handwriting image or scan (PNG, JPG, WEBP, GIF or PDF).</p>
        <input type="file" accept=".png,.jpg,.jpeg,.webp,.gif,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="input" />
        <button className="btn-primary" disabled={busy}>{busy ? 'Extracting…' : 'Upload & extract'}</button>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </form>

      {active && (
        <div className="card">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink-900">{active.title}</h3>
            <span className={`rounded-full px-2 py-1 text-xs ${statusColor(active.ocrStatus)}`}>{active.ocrStatus}</span>
          </div>
          {active.ocrConfidence != null && <p className="text-xs text-slate-400">Confidence: {Math.round(active.ocrConfidence * 100)}%</p>}
          {active.ocrError && <p className="mt-1 text-xs text-amber-700">{active.ocrError}</p>}
          <div className="mt-3">
            <label className="label">Extracted / corrected text</label>
            <textarea className="input min-h-32" value={corrected} onChange={(e) => setCorrected(e.target.value)} placeholder="Edit the extracted text here to correct OCR." />
          </div>
          <button className="btn-primary mt-2" onClick={save}>Save corrections</button>
        </div>
      )}

      {notes.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-ink-900">Your scans</h3>
          <div className="mt-2 space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50">
                <span className="text-sm">{n.title}</span>
                <span className={`rounded-full px-2 py-1 text-xs ${statusColor(n.ocrStatus)}`}>{n.ocrStatus}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const statusColor = (s: string) =>
  s === 'DONE' ? 'bg-green-100 text-green-700' : s === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600';
