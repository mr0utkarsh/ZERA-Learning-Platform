import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { User, AlertCircle } from 'lucide-react';

const LEVELS = ['school', 'diploma', 'undergraduate', 'postgraduate', 'competitive'];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
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

  const STEPS = [
    { label: 'Welcome', desc: 'Tell us your name' },
    { label: 'Level', desc: 'Academic level & course' },
    { label: 'Subjects', desc: 'Select your subjects' },
    { label: 'Goals', desc: 'Study goal & target date' },
    { label: 'Rhythm', desc: 'Weekly availability' },
    { label: 'Confidence', desc: 'Baseline confidence' },
    { label: 'Plan', desc: 'Generate learning plan' },
  ];

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const buildPayload = () => ({
    ...form,
    dailyMinutes: Number(form.dailyMinutes),
    weeklyHours: Number(form.weeklyHours),
    examDate: form.examDate ? new Date(form.examDate).toISOString() : undefined,
    subjects: subjects.split(',').map((s) => s.trim()).filter(Boolean),
    difficultAreas: difficultAreas.split(',').map((s) => s.trim()).filter(Boolean)
  });

  /** "Continue" only moves to the next step — nothing is persisted yet. */
  const nextStep = () => {
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  /** "Skip to end" jumps to the final step without persisting. */
  const skipToEnd = () => {
    setError('');
    setStep(STEPS.length - 1);
  };

  /** Final step: persist the profile, then move on to the syllabus. */
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.onboarding.saveAcademic(buildPayload());
      navigate('/syllabus');
    } catch (err: any) {
      setError(err.message || 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  };

  const progress = ((step) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-void text-fg py-8 px-4 md:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <User className="h-5 w-5 text-violet-300 shrink-0" />
          <h1 className="text-3xl font-bold text-fg">Welcome to ZERA</h1>
        </div>

        <p className="text-lg text-muted mb-8 leading-relaxed">
          Let's set up your learning journey. You can skip anything and finish later.
        </p>

        <div className="mb-8">
          <div className="flex justify-between text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            {STEPS.map((s, i) => (
              <span key={i} className={`text-xs ${i <= step ? 'text-fg' : 'text-muted'}`}>{s.label}</span>
            ))}
          </div>
          <div className="h-2 w-full rounded-full bg-surface-3 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <form onSubmit={(e) => onSubmit(e)} className="space-y-6">
          {/* Step 0: Welcome/name */}
          {step === 0 && (
            <div className="card-lift zera-card p-8 text-center">
              <h2 className="text-2xl font-bold text-fg mb-3">Hi, what's your name?</h2>
              <p className="text-sm text-muted mb-6">This helps us personalize your experience.</p>
              <div>
                <label className="field-label">Full name</label>
                <input className="field-input mx-auto w-96" value={form.displayName} onChange={(e) => set('displayName', e.target.value)} required />
              </div>
            </div>
          )}

          {/* Step 1: Academic level & course */}
          {step === 1 && (
            <div className="card-lift zera-card p-8 space-y-5">
              <div>
                <label className="field-label">Education level</label>
                <select className="field-select" value={form.educationLevel} onChange={(e) => set('educationLevel', e.target.value)}>
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Course / program</label>
                <input className="field-input" value={form.courseProgram} onChange={(e) => set('courseProgram', e.target.value)} placeholder="B.Tech CSE" />
              </div>
              <div>
                <label className="field-label">Institution / university</label>
                <input className="field-input" value={form.institution} onChange={(e) => set('institution', e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 2: Subjects */}
          {step === 2 && (
            <div className="card-lift zera-card p-8 space-y-4">
              <div>
                <label className="field-label">Subjects (comma separated)</label>
                <input className="field-input" value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="DBMS, OS, Networks" />
              </div>
              <p className="text-sm text-muted">e.g. Database Systems, Operating Systems, Computer Networks</p>
            </div>
          )}

          {/* Step 3: Goals */}
          {step === 3 && (
            <div className="card-lift zera-card p-8 space-y-4">
              <div>
                <label className="field-label">Exam type</label>
                <input className="field-input" value={form.examType} onChange={(e) => set('examType', e.target.value)} placeholder="End Semester" />
              </div>
              <div>
                <label className="field-label">Exam date (optional)</label>
                <input className="field-input" type="date" value={form.examDate} onChange={(e) => set('examDate', e.target.value)} />
              </div>
              <div>
                <label className="field-label">Study goal</label>
                <select className="field-select" value={form.explanationStyle} onChange={(e) => set('explanationStyle', e.target.value)}>
                  {['simple', 'detailed', 'example-first', 'exam-focused'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 4: Weekly availability */}
          {step === 4 && (
            <div className="card-lift zera-card p-8 space-y-4">
              <div>
                <label className="field-label">Daily study minutes</label>
                <input className="field-input" type="number" min={0} max={1440} value={form.dailyMinutes} onChange={(e) => set('dailyMinutes', e.target.value)} />
              </div>
              <div>
                <label className="field-label">Preferred study time</label>
                <select className="field-select" value={form.studyTimePref} onChange={(e) => set('studyTimePref', e.target.value)}>
                  {['morning', 'afternoon', 'evening', 'night'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 5: Confidence */}
          {step === 5 && (
            <div className="card-lift zera-card p-8 space-y-4">
              <div>
                <label className="field-label">Areas you find difficult (comma separated)</label>
                <input className="field-input" value={difficultAreas} onChange={(e) => setDifficultAreas(e.target.value)} placeholder="Indexing, Normalization" />
              </div>
            </div>
          )}

          {/* Step 6: Generate plan */}
          {step === 6 && (
            <div className="card-lift zera-card p-8 text-center">
              <h2 className="text-2xl font-bold text-fg mb-3">Generate your learning plan</h2>
              <p className="text-sm text-muted mb-6">Based on your inputs, ZERA will create a personalized study plan for you.</p>
              <p className="text-xs text-muted mb-6">You can always adjust it later from your dashboard.</p>
            </div>
          )}
          {error && (
            <div className="rounded-xl bg-red-500/10 px-3 py-2.5 ring-1 ring-red-500/20 text-sm text-error flex items-start gap-3">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 justify-between">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="btn-secondary px-6 py-3"
              >
                Back
              </button>
            )}
            <span className="flex-1" />
            {step === STEPS.length - 1 ? (
              <button className="btn-primary px-8 py-3" disabled={busy}>
                {busy ? 'Creating plan…' : 'Finish setup'}
              </button>
            ) : (
              <button
                type="button"
                onClick={nextStep}
                className="btn-primary px-8 py-3" disabled={busy}
              >
                Continue →
              </button>
            )}
            {step < STEPS.length - 1 && (
              <button
                type="button"
                onClick={skipToEnd}
                className="btn-ghost px-6 py-3 text-sm"
              >
                Skip to end
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
