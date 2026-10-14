import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, tokenStore } from '../lib/api';
import SyllabusConfirm, { Subject, emptySubject } from './SyllabusConfirm';

export default function Syllabus() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'upload' | 'confirm'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [extracted, setExtracted] = useState('');
  const [courseName, setCourseName] = useState('');
  const [semester, setSemester] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [saved, setSaved] = useState<any[]>([]);

  useEffect(() => {
    api.syllabus.list().then(setSaved).catch(() => setSaved([]));
  }, []);

  const upload = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!file) return setError('Choose a syllabus file first.');
    const allowed = ['pdf', 'docx', 'txt', 'md', 'csv', 'json'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowed.includes(ext)) return setError('Unsupported format. Upload a PDF, DOCX, TXT, MD, CSV or JSON file.');
    if (file.size > 10 * 1024 * 1024) return setError('File is larger than 10 MB.');
    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadWithProgress(file, setProgress);
      setExtracted(result.extractedText || '');
      setCourseName(result.courseName || result.analysis?.course || '');
      setSemester(result.semester || result.analysis?.semester || '');
      setSubjects(Array.isArray(result.subjects) && result.subjects.length ? result.subjects : [emptySubject()]);
      setTab('confirm');
    } catch (err: any) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const valid = subjects.filter((s) => s.title && s.units.some((u) => u.topics.some((t) => t.title)));
      if (valid.length === 0) return setError('Add at least one subject with topics before confirming.');
      const savedSyllabus = await api.syllabus.confirm({ courseName, semester, subjects: valid });
      await api.progress.init(savedSyllabus.id).catch(() => null);
      setSaved((prev) => [savedSyllabus, ...prev]);
      navigate('/study-plan');
    } catch (err: any) {
      setError(err.message || 'Could not save the syllabus.');
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex gap-2">
        <button className={tab === 'upload' ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab('upload')}>Upload</button>
        <button className={tab === 'confirm' ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab('confirm')} disabled={!extracted && saved.length === 0}>Review & confirm</button>
      </div>

      {tab === 'upload' && (
        <form onSubmit={upload} className="card mt-4 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-ink-900">Upload your syllabus</h1>
            <p className="text-sm text-slate-500">PDF, DOCX, TXT, MD, CSV or JSON · max 10 MB.</p>
          </div>
          <input type="file" accept=".pdf,.docx,.txt,.md,.csv,.json" onChange={(e) => setFile(e.target.files?.[0] || null)} className="input" />
          {uploading && (
            <div>
              <div className="h-2 w-full rounded bg-slate-200"><div className="h-2 rounded bg-brand-600 transition-all" style={{ width: `${progress}%` }} /></div>
              <p className="mt-1 text-xs text-slate-500">{progress}%</p>
            </div>
          )}
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button className="btn-primary" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload & analyze'}</button>
        </form>
      )}

      {tab === 'confirm' && (
        <SyllabusConfirm courseName={courseName} setCourseName={setCourseName} semester={semester} setSemester={setSemester}
          subjects={subjects} setSubjects={setSubjects} onSave={confirm} error={error} />
      )}

      {saved.length > 0 && (
        <div className="card mt-6">
          <h3 className="font-semibold text-ink-900">Confirmed syllabi</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {saved.map((s) => <li key={s.id}>{s.courseName} {s.semester ? `· ${s.semester}` : ''}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Upload with XHR so the UI can show real percentage progress. */
function uploadWithProgress(file: File, onProgress: (pct: number) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file, file.name);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${(import.meta.env.VITE_API_URL as string) || ''}/api/onboarding/syllabus`);
    const token = tokenStore.get();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(json.data || json);
        else reject(new Error(json.message || `Upload failed (${xhr.status})`));
      } catch { reject(new Error(`Upload failed (${xhr.status})`)); }
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.send(form);
  });
}
