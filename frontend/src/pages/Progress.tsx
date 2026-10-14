import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_REVISION'] as const;

export default function Progress() {
  const [syllabi, setSyllabi] = useState<any[]>([]);
  const [syllabusId, setSyllabusId] = useState('');
  const [progress, setProgress] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => { api.syllabus.list().then(setSyllabi).catch(() => setSyllabi([])); }, []);

  useEffect(() => {
    if (!syllabusId) return;
    setError('');
    api.progress.get(syllabusId).then(setProgress).catch((e) => setError(e.message));
  }, [syllabusId]);

  const setStatus = async (topicId: string, status: string) => {
    await api.progress.setTopic(topicId, status).catch(() => null);
    if (syllabusId) setProgress(await api.progress.get(syllabusId).catch(() => null));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold text-ink-900">Syllabus progress</h1>
      <select className="input max-w-xs" value={syllabusId} onChange={(e) => setSyllabusId(e.target.value)}>
        <option value="">Select a confirmed syllabus</option>
        {syllabi.map((s) => <option key={s.id} value={s.id}>{s.courseName}</option>)}
      </select>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!syllabusId && <p className="text-sm text-slate-500">Confirm a syllabus first to track topic-by-topic progress.</p>}

      {progress && (
        <>
          <div className="card flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Overall progress</div>
              <div className="text-3xl font-bold text-brand-700">{progress.overallPercentage ?? 0}%</div>
            </div>
            <div className="text-right text-sm text-slate-500">
              {progress.completedTopics}/{progress.totalTopics} topics completed
            </div>
          </div>
          <p className="text-xs text-slate-400">{progress.formula}</p>
          <div className="space-y-4">
            {progress.subjects.map((subject: any) => (
              <div key={subject.id} className="card">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-ink-900">{subject.title}</h3>
                  <span className="text-sm text-slate-500">{subject.percentage ?? 0}%</span>
                </div>
                <div className="mt-2 space-y-2">
                  {subject.units.map((unit: any) => (
                    <div key={unit.id} className="rounded-xl bg-slate-50 p-3">
                      <div className="text-sm font-medium">{unit.title} <span className="text-slate-400">· {unit.percentage ?? 0}%</span></div>
                      <div className="mt-2 space-y-1">
                        {unit.topics.map((topic: any) => (
                          <div key={topic.id} className="flex items-center gap-3">
                            <span className="flex-1 text-sm">{topic.title}{topic.needsRevision ? ' · needs revision' : ''}</span>
                            <select className="input w-44 py-1 text-xs" value={topic.status} onChange={(e) => setStatus(topic.id, e.target.value)} aria-label={`Status for ${topic.title}`}>
                              {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ').toLowerCase()}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
