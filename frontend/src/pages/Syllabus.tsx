import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiUrl, tokenStore } from '../lib/api';
import SyllabusConfirm, { Subject, emptySubject } from './SyllabusConfirm';
import { FileText, Upload } from 'lucide-react';

export default function Syllabus() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'upload' | 'confirm' | 'view'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [, setExtracted] = useState('');
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
    <div className="min-h-screen bg-void text-fg py-8 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="h-5 w-5 text-violet-300 shrink-0" />
          <h1 className="text-3xl font-bold text-fg">Syllabus Workspace</h1>
        </div>

        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setTab('upload')}
            className={`btn ${tab === 'upload' ? 'btn-primary' : 'btn-secondary'} px-6 py-3`}
          >
            <Upload className="h-4 w-4 mr-2" /> Upload
          </button>
          <button
            onClick={() => setTab('view')}
            disabled={saved.length === 0}
            className={`btn ${tab === 'view' ? 'btn-primary' : 'btn-secondary'} px-6 py-3 ${saved.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            View syllabi
          </button>
        </div>

        {tab === 'upload' && (
          <form onSubmit={upload} className="card-lift zera-card p-6 mb-8 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-fg mb-1">Upload your syllabus</h2>
              <p className="text-sm text-muted">PDF, DOCX, TXT, MD, CSV or JSON · max 10 MB.</p>
            </div>
            <div className="relative">
              <input
                id="syllabus-file"
                type="file"
                accept=".pdf,.docx,.txt,.md,.csv,.json"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="sr-only"
                aria-label="Upload syllabus file"
              />
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); (document.getElementById('syllabus-file') as HTMLInputElement)?.click(); }}
                className="w-full rounded-xl border-2 border-dashed border-white/10 bg-surface-2 px-6 py-8 text-center text-sm text-muted hover:border-white/20 hover:bg-white/5 transition-colors"
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-fg">{file.name}</span>
                    <button
                      onClick={(e) => { e.preventDefault(); setFile(null); }}
                      className="text-xs text-error hover:text-red-400"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-fg">Click to upload syllabus file</p>
                    <p className="text-xs text-muted">PDF, DOCX, TXT, MD, CSV or JSON</p>
                  </div>
                )}
              </button>
            </div>
            {uploading && (
              <div className="space-y-2">
                <div className="h-2 w-full rounded-full bg-surface-3 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-muted">{progress}%</p>
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-500/10 px-3 py-2.5 ring-1 ring-red-500/20 text-sm text-error flex items-start gap-3">
                <span>{error}</span>
              </div>
            )}
            <button className="btn-primary w-full py-3" disabled={uploading || !file}>
              {uploading ? 'Uploading…' : 'Upload & analyze'}
            </button>
          </form>
        )}

        {tab === 'confirm' && (
          <SyllabusConfirm
            courseName={courseName}
            setCourseName={setCourseName}
            semester={semester}
            setSemester={setSemester}
            subjects={subjects}
            setSubjects={setSubjects}
            onSave={confirm}
            error={error}
          />
        )}

        {tab === 'view' && saved.length > 0 && (
          <div className="card-lift zera-card p-6">
            <h3 className="text-lg font-bold text-fg mb-4">Confirmed syllabi</h3>
            <div className="space-y-3">
              {saved.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl px-4 py-3 bg-surface-2 border border-white/5 hover:bg-white/5 transition-colors">
                  <span className="text-sm font-medium text-fg">{s.courseName}</span>
                  {s.semester && <span className="text-xs text-muted">· {s.semester}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Upload with XHR so the UI can show real percentage progress. */
function uploadWithProgress(file: File, onProgress: (pct: number) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file, file.name);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl('/onboarding/syllabus'));
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
