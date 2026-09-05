import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import Markdown from '../components/Markdown';
import { ErrorAlert, PageSpinner, ServiceNotice } from '../components/ui';

export default function Lesson() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [note, setNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteMsg, setNoteMsg] = useState(null);
  const [aiNoteMsg, setAiNoteMsg] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editObjectives, setEditObjectives] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState(null);
  const studyStart = useRef(Date.now());

  const load = () => {
    setError(null);
    setData(null);
    api.get(`/courses/lessons/${id}`)
      .then((d) => {
        setData(d);
        setNote(d.personalNote?.content || '');
        studyStart.current = Date.now();
      })
      .catch(setError);
  };
  useEffect(load, [id]);

  // Record study time when leaving the lesson (1–480 min, silently)
  useEffect(() => () => {
    const minutes = Math.round((Date.now() - studyStart.current) / 60000);
    if (minutes >= 1) {
      api.post('/courses/study-sessions', { lessonId: id, minutes: Math.min(minutes, 480) }).catch(() => {});
    }
  }, [id]);

  const toggleComplete = async () => {
    if (!data) return;
    setCompleting(true);
    try {
      if (data.lesson.completed) {
        await api.delete(`/courses/lessons/${id}/complete`);
      } else {
        await api.post(`/courses/lessons/${id}/complete`);
      }
      load();
    } catch (err) {
      setError(err);
    } finally {
      setCompleting(false);
    }
  };

  const saveNote = async () => {
    setNoteSaving(true);
    setNoteMsg(null);
    try {
      await api.put(`/courses/lessons/${id}/note`, { content: note });
      setNoteMsg('Note saved.');
    } catch (err) {
      setNoteMsg(err.message);
    } finally {
      setNoteSaving(false);
    }
  };

  const generateAiNotes = async () => {
    setAiNoteMsg(null);
    try {
      await api.post('/notes/generate', { targetType: 'LESSON', targetId: id });
      setAiNoteMsg('Notes generated — find them on the Notes page.');
    } catch (err) {
      setAiNoteMsg(err.message);
      if (err.code === 'AI_NOT_CONFIGURED') setAiNoteMsg('__ai_not_configured__');
    }
  };

  if (!data && !error) return <PageSpinner label="Loading lesson…" />;

  const l = data?.lesson;

  return (
    <div className="page">
      <ErrorAlert error={error} onRetry={load} />
      {l && (
        <>
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link to="/courses">Courses</Link><span className="sep">/</span>
            <Link to={`/courses/${l.breadcrumbs.course.id}`}>{l.breadcrumbs.course.name}</Link><span className="sep">/</span>
            <span>{l.breadcrumbs.subject.name}</span><span className="sep">/</span>
            <span>{l.breadcrumbs.unit.name}</span><span className="sep">/</span>
            <span>{l.breadcrumbs.chapter.name}</span><span className="sep">/</span>
            <span>{l.breadcrumbs.topic.name}</span>
          </nav>

          <div className="lesson-layout">
            <div>
              <div className="card">
                <div className="flex-between">
                  <h1 style={{ fontSize: 24, margin: 0 }}>{l.title}</h1>
                  {l.completed && <span className="badge badge-green">✓ Completed</span>}
                </div>

                {l.objectives?.length > 0 && (
                  <div className="alert alert-info mt-20" style={{ marginTop: 18 }}>
                    <div>
                      <b>Learning objectives</b>
                      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                        {l.objectives.map((o, i) => <li key={i}>{o}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="lesson-content mt-20">
                  {l.content ? <Markdown text={l.content} /> : (
                    <p className="muted">This lesson has no written content yet. Use the AI tools on the right to generate notes, or ask the tutor about this topic.</p>
                  )}
                </div>

                <hr className="divider" />
                <div className="flex-between">
                  <button className={`btn ${l.completed ? 'btn-outline' : 'btn-success'}`} onClick={toggleComplete} disabled={completing}>
                    {completing ? 'Saving…' : l.completed ? '↺ Mark as not complete' : '✓ Mark lesson complete'}
                  </button>
                  <div className="flex">
                    {l.prevLesson && <Link className="btn btn-outline btn-sm" to={`/lessons/${l.prevLesson.id}`}>← {l.prevLesson.title.slice(0, 24)}</Link>}
                    {l.nextLesson && <Link className="btn btn-primary btn-sm" to={`/lessons/${l.nextLesson.id}`}>{l.nextLesson.title.slice(0, 24)} →</Link>}
                  </div>
                </div>
              </div>

              {/* Personal notes */}
              <div className="card mt-20">
                <h3>My notes for this lesson</h3>
                <textarea className="textarea" rows={5} value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Write your own notes here — they are saved to your account." aria-label="Personal lesson notes" />
                <div className="flex mt-12">
                  <button className="btn btn-primary btn-sm" onClick={saveNote} disabled={noteSaving}>
                    {noteSaving ? 'Saving…' : 'Save note'}
                  </button>
                  {noteMsg && <span className="small muted">{noteMsg}</span>}
                </div>
              </div>

              {/* Sibling lessons */}
              <div className="card mt-20">
                <h3>In this topic: {l.breadcrumbs.topic.name}</h3>
                {l.siblingLessons.map((s) => (
                  <div className="lesson-row" key={s.id}>
                    <span aria-hidden="true">{s.id === l.id ? '📖' : '·'}</span>
                    <Link to={`/lessons/${s.id}`} style={s.id === l.id ? { fontWeight: 700, color: 'var(--primary-dark)' } : {}}>
                      {s.title}
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar tools */}
            <aside>
              {data.lessonOwned && (
                <div className="card mb-12">
                  <h3>Edit lesson</h3>
                  {!editOpen ? (
                    <button className="btn btn-outline btn-block" onClick={() => {
                      setEditTitle(l.title);
                      setEditContent(l.content || '');
                      setEditObjectives((l.objectives || []).join('\n'));
                      setEditErr(null);
                      setEditOpen(true);
                    }}>✏️ Edit content</button>
                  ) : (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      setEditSaving(true);
                      setEditErr(null);
                      try {
                        await api.patch(`/courses/lessons/${id}`, {
                          title: editTitle.trim(),
                          content: editContent,
                          objectives: editObjectives.split('\n').map((s) => s.trim()).filter(Boolean),
                        });
                        setEditOpen(false);
                        load();
                      } catch (err) {
                        setEditErr(err.message);
                      } finally {
                        setEditSaving(false);
                      }
                    }}>
                      {editErr && <div className="alert alert-error">{editErr}</div>}
                      <div className="field">
                        <label htmlFor="e-title">Title</label>
                        <input id="e-title" className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={300} />
                      </div>
                      <div className="field">
                        <label htmlFor="e-content">Content (Markdown)</label>
                        <textarea id="e-content" className="textarea" rows={8} value={editContent} onChange={(e) => setEditContent(e.target.value)} maxLength={20000} />
                      </div>
                      <div className="field">
                        <label htmlFor="e-obj">Objectives (one per line)</label>
                        <textarea id="e-obj" className="textarea" rows={3} value={editObjectives} onChange={(e) => setEditObjectives(e.target.value)} />
                      </div>
                      <div className="flex">
                        <button className="btn btn-primary btn-sm" disabled={editSaving || !editTitle.trim()}>{editSaving ? 'Saving…' : 'Save'}</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditOpen(false)}>Cancel</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
              <div className="card">
                <h3>AI tools</h3>
                <p className="small muted">Actions apply to this lesson.</p>
                <button className="btn btn-outline btn-block mb-12" onClick={generateAiNotes}>✍️ Generate notes</button>
                <button className="btn btn-outline btn-block mb-12" onClick={() => api.post('/notes/generate', { targetType: 'LESSON', targetId: id, style: 'HANDWRITTEN' }).then(() => setAiNoteMsg('Handwritten-style notes generated — find them on the Notes page.')).catch((e) => setAiNoteMsg(e.code === 'AI_NOT_CONFIGURED' ? '__ai_not_configured__' : e.message))}>
                  🖋️ Handwritten-style notes
                </button>
                <Link className="btn btn-outline btn-block" to="/doubts" state={{ context: `${l.breadcrumbs.subject.name} — ${l.breadcrumbs.topic.name} — ${l.title}` }}>
                  💬 Ask the tutor
                </Link>
                {aiNoteMsg === '__ai_not_configured__' ? (
                  <div className="mt-12"><ServiceNotice service="AI notes" /></div>
                ) : aiNoteMsg && <p className="small mt-12 mb-0" style={{ marginTop: 10 }}>{aiNoteMsg}</p>}
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
