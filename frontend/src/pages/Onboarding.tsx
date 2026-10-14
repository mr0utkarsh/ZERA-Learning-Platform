import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const LEVELS = ['school', 'diploma', 'undergraduate', 'postgraduate', 'competitive'];

export default function Onboarding() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    displayName: '', country: '', language: 'English', educationLevel: 'undergraduate',
    courseProgram: '', semester: '', branch: '', institution: '', examType: '',
    examDate: '', dailyMinutes: 60, weeklyHours: 10, studyTimePref: 'evening',
    explanationStyle: 'simple', preferredLanguage: 'English'
  });
  const [subjects, setSubjects] = useState('');
  const [difficultAreas, setDifficultAreas] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: FormEvent, skip = false) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (!skip) {
        await api.onboarding.saveAcademic({
          ...form,
          dailyMinutes: Number(form.dailyMinutes),
          weeklyHours: Number(form.weeklyHours),
          examDate: form.examDate ? new Date(form.examDate).toISOString() : undefined,
          subjects: subjects.split(',').map((s) => s.trim()).filter(Boolean),
          difficultAreas: difficultAreas.split(',').map((s) => s.trim()).filter(Boolean)
        });
      }
      navigate('/syllabus');
    } catch (err: any) {
      setError(err.message || 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-ink-900">Tell us about your studies</h1>
      <p className="mt-1 text-sm text-slate-500">We use this to build your personalized plan. You can skip anything and finish later.</p>
      <form onSubmit={(e) => onSubmit(e)} className="mt-6 grid gap-4 sm:grid-cols-2">
        <div><label className="label">Display name</label><input className="input" value={form.displayName} onChange={(e) => set('displayName', e.target.value)} /></div>
        <div><label className="label">Country</label><input className="input" value={form.country} onChange={(e) => set('country', e.target.value)} /></div>
        <div><label className="label">Education level</label>
          <select className="input" value={form.educationLevel} onChange={(e) => set('educationLevel', e.target.value)}>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div><label className="label">Course / program</label><input className="input" value={form.courseProgram} onChange={(e) => set('courseProgram', e.target.value)} placeholder="B.Tech CSE" /></div>
        <div><label className="label">Semester</label><input className="input" value={form.semester} onChange={(e) => set('semester', e.target.value)} placeholder="Semester 5" /></div>
        <div><label className="label">Branch / specialization</label><input className="input" value={form.branch} onChange={(e) => set('branch', e.target.value)} /></div>
        <div><label className="label">Institution / university</label><input className="input" value={form.institution} onChange={(e) => set('institution', e.target.value)} /></div>
        <div><label className="label">Subjects (comma separated)</label><input className="input" value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="DBMS, OS, Networks" /></div>
        <div><label className="label">Exam type</label><input className="input" value={form.examType} onChange={(e) => set('examType', e.target.value)} placeholder="End Semester" /></div>
        <div><label className="label">Exam date (optional)</label><input className="input" type="date" value={form.examDate} onChange={(e) => set('examDate', e.target.value)} /></div>
        <div><label className="label">Daily study minutes</label><input className="input" type="number" min={0} max={1440} value={form.dailyMinutes} onChange={(e) => set('dailyMinutes', e.target.value)} /></div>
        <div><label className="label">Preferred time</label>
          <select className="input" value={form.studyTimePref} onChange={(e) => set('studyTimePref', e.target.value)}>
            {['morning', 'afternoon', 'evening', 'night'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2"><label className="label">Areas you find difficult (comma separated)</label><input className="input" value={difficultAreas} onChange={(e) => setDifficultAreas(e.target.value)} placeholder="Indexing, Normalization" /></div>
        <div><label className="label">Explanation style</label>
          <select className="input" value={form.explanationStyle} onChange={(e) => set('explanationStyle', e.target.value)}>
            {['simple', 'detailed', 'example-first', 'exam-focused'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</p>}
        <div className="flex gap-3 sm:col-span-2">
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save & continue'}</button>
          <button type="button" className="btn-ghost" onClick={(e) => onSubmit(e, true)} disabled={busy}>Skip for now</button>
        </div>
      </form>
    </div>
  );
}
