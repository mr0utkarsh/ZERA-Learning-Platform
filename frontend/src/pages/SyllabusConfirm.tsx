import { FormEvent } from 'react';

export type Topic = { title: string; difficulty?: string };
export type Unit = { title: string; topics: Topic[] };
export type Subject = { title: string; units: Unit[] };

export const emptySubject = (): Subject => ({ title: '', units: [{ title: 'Unit 1', topics: [{ title: '' }] }] });

export default function SyllabusConfirm({ courseName, setCourseName, semester, setSemester, subjects, setSubjects, onSave, error }: {
  courseName: string;
  setCourseName: (v: string) => void;
  semester: string;
  setSemester: (v: string) => void;
  subjects: Subject[];
  setSubjects: (fn: (prev: Subject[]) => Subject[]) => void;
  onSave: (e: FormEvent) => void;
  error: string;
}) {
  const updateSubject = (si: number, patch: Partial<Subject>) =>
    setSubjects((prev) => prev.map((s, i) => (i === si ? { ...s, ...patch } : s)));
  const updateUnit = (si: number, ui: number, patch: Partial<Unit>) =>
    setSubjects((prev) => prev.map((s, i) => (i === si ? { ...s, units: s.units.map((u, j) => (j === ui ? { ...u, ...patch } : u)) } : s)));
  const updateTopic = (si: number, ui: number, ti: number, patch: Partial<Topic>) =>
    setSubjects((prev) => prev.map((s, i) => (i === si ? { ...s, units: s.units.map((u, j) => (j === ui ? { ...u, topics: u.topics.map((t, k) => (k === ti ? { ...t, ...patch } : t)) } : u)) } : s)));

  return (
    <form onSubmit={onSave} className="mt-4 space-y-4">
      <div className="card space-y-3">
        <h1 className="text-xl font-bold text-ink-900">Confirm your syllabus</h1>
        <p className="text-sm text-slate-500">Review what we detected. Edit, add or remove topics, then confirm. Nothing is invented — what you see came from your file.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Course</label><input className="input" value={courseName} onChange={(e) => setCourseName(e.target.value)} required /></div>
          <div><label className="label">Semester</label><input className="input" value={semester} onChange={(e) => setSemester(e.target.value)} /></div>
        </div>
      </div>

      {subjects.map((subject, si) => (
        <div key={si} className="card">
          <div className="flex gap-2">
            <input className="input" placeholder="Subject" value={subject.title} onChange={(e) => updateSubject(si, { title: e.target.value })} />
            <button type="button" className="btn-ghost" onClick={() => setSubjects((p) => p.filter((_, i) => i !== si))}>Remove</button>
          </div>
          {subject.units.map((unit, ui) => (
            <div key={ui} className="mt-3 rounded-xl bg-slate-50 p-3">
              <input className="input" placeholder="Unit" value={unit.title} onChange={(e) => updateUnit(si, ui, { title: e.target.value })} />
              <div className="mt-2 space-y-2">
                {unit.topics.map((topic, ti) => (
                  <div key={ti} className="flex gap-2">
                    <input className="input" placeholder="Topic" value={topic.title} onChange={(e) => updateTopic(si, ui, ti, { title: e.target.value })} />
                    <select className="input w-28" value={topic.difficulty || ''} onChange={(e) => updateTopic(si, ui, ti, { difficulty: e.target.value || undefined })}>
                      <option value="">—</option><option value="easy">easy</option><option value="medium">medium</option><option value="hard">hard</option>
                    </select>
                    <button type="button" className="btn-ghost" onClick={() => updateUnit(si, ui, { topics: unit.topics.filter((_, i) => i !== ti) })}>×</button>
                  </div>
                ))}
                <button type="button" className="btn-ghost text-xs" onClick={() => updateUnit(si, ui, { topics: [...unit.topics, { title: '' }] })}>+ Add topic</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn-ghost mt-3 text-xs" onClick={() => updateSubject(si, { units: [...subject.units, { title: `Unit ${subject.units.length + 1}`, topics: [{ title: '' }] }] })}>+ Add unit</button>
        </div>
      ))}
      <button type="button" className="btn-ghost" onClick={() => setSubjects((p) => [...p, emptySubject()])}>+ Add subject</button>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button className="btn-primary">Confirm syllabus & continue</button>
    </form>
  );
}
