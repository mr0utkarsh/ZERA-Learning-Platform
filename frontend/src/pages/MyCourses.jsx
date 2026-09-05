import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ErrorAlert, PageSpinner, ProgressBar, EmptyState, Modal, ServiceNotice } from '../components/ui';
import { fmtDate } from '../utils/format';

function SyllabusReviewModal({ structure, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const d = await api.post('/syllabus/confirm', structure);
      onSaved(d.courseId);
    } catch (err) {
      setError(err);
      setSaving(false);
    }
  };

  return (
    <Modal title="Review the generated structure" onClose={onClose}>
      <p className="small muted">
        The AI proposed this structure from your syllabus. Please check it before saving — nothing is
        stored until you confirm. You can also discard it and build the course manually.
      </p>
      <ErrorAlert error={error} />
      <div className="card card-tight mb-12" style={{ maxHeight: 340, overflowY: 'auto' }}>
        <b>{structure.courseName}</b>
        {structure.description && <div className="small muted mt-12">{structure.description}</div>}
        <hr className="divider" />
        {structure.subjects.map((s, i) => (
          <details key={i} open style={{ marginBottom: 8 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
              {s.name} {s.code ? <span className="badge badge-gray">{s.code}</span> : null}
            </summary>
            <div style={{ paddingLeft: 16, fontSize: 13.5, color: 'var(--muted)' }}>
              {s.units?.length ? s.units.map((u, j) => (
                <div key={j} style={{ margin: '4px 0' }}>
                  • {u.name}
                  {u.chapters?.length > 0 && (
                    <div style={{ paddingLeft: 14 }}>
                      {u.chapters.map((c, k) => (
                        <div key={k}>– {c.name} <span className="small">({c.topics?.length || 0} topics)</span></div>
                      ))}
                    </div>
                  )}
                </div>
              )) : <div className="small">No units detected</div>}
            </div>
          </details>
        ))}
      </div>
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onClose}>Discard</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save this structure'}
        </button>
      </div>
    </Modal>
  );
}

export default function MyCourses() {
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busyCreate, setBusyCreate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [review, setReview] = useState(null); // proposed structure
  const [managing, setManaging] = useState(null); // { mode: 'rename'|'delete', course }
  const [manageValue, setManageValue] = useState('');
  const [manageBusy, setManageBusy] = useState(false);
  const [manageErr, setManageErr] = useState(null);
  const fileRef = useRef(null);
  const navigate = useNavigate();

  const load = () => {
    setError(null);
    api.get('/courses').then((d) => setCourses(d.courses)).catch(setError);
  };
  useEffect(load, []);

  const createCourse = async (e) => {
    e.preventDefault();
    setBusyCreate(true);
    try {
      await api.post('/courses', { name, description });
      setCreating(false);
      setName('');
      setDescription('');
      load();
    } catch (err) {
      setUploadError(err);
    } finally {
      setBusyCreate(false);
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const fd = new FormData();
    fd.append('syllabus', file);
    setUploading(true);
    setUploadError(null);
    try {
      const d = await api.postForm('/syllabus/upload', fd);
      setReview(d.structure);
    } catch (err) {
      setUploadError(err);
    } finally {
      setUploading(false);
    }
  };

  if (!courses && !error) return <PageSpinner label="Loading courses…" />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>My Courses</h1>
          <p className="sub">Your syllabus, structured and tracked.</p>
        </div>
        <div className="flex">
          <button className="btn btn-outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Analyzing syllabus…</> : '📤 Upload syllabus'}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={onFile} aria-label="Upload syllabus file" />
          <button className="btn btn-primary" onClick={() => setCreating(true)}>+ New course</button>
        </div>
      </div>

      <ErrorAlert error={error} onRetry={load} />
      {uploadError && <ErrorAlert error={uploadError} />}
      {uploadError?.code === 'AI_NOT_CONFIGURED' && (
        <ServiceNotice service="AI syllabus analysis" hint="You can still create a course manually and add subjects, units, chapters and topics yourself." />
      )}

      {courses && courses.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="📚"
            title="No courses yet"
            message="Upload your syllabus (PDF, DOCX or TXT) to let the AI structure it, or create a course manually and build the hierarchy yourself."
            actionOnClick={() => setCreating(true)}
            actionLabel="Create your first course"
          />
        </div>
      ) : (
        <div className="grid grid-2">
          {courses.map((c) => (
            <div key={c.id} className="card" style={{ display: 'block' }}>
              <div className="flex-between">
                <h3 className="mb-0">
                  <Link to={`/courses/${c.id}`} style={{ color: 'inherit' }}>{c.name}</Link>
                </h3>
                <span className={`badge ${c.source === 'SYLLABUS_UPLOAD' ? '' : 'badge-gray'}`}>
                  {c.source === 'SYLLABUS_UPLOAD' ? '📤 Syllabus upload' : '✏️ Manual'}
                </span>
              </div>
              {c.description && <p className="small muted mt-12">{c.description}</p>}
              <div className="mt-12" style={{ marginTop: 14 }}>
                <ProgressBar value={c.progress} green={c.progress === 100} label={`${c.completedLessons}/${c.totalLessons} lessons`} />
              </div>
              <div className="flex-between small muted" style={{ marginTop: 10 }}>
                <span>{c.subjectCount} subject{c.subjectCount === 1 ? '' : 's'} · added {fmtDate(c.createdAt)}</span>
                {c.isOwn && (
                  <span className="flex" style={{ gap: 4 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => { setManageErr(null); setManageValue(c.name); setManaging({ mode: 'rename', course: c }); }}>✏️ Rename</button>
                    <button className="btn btn-danger btn-sm" onClick={() => { setManageErr(null); setManaging({ mode: 'delete', course: c }); }}>🗑</button>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <Modal title="Create a course" onClose={() => setCreating(false)}>
          <form onSubmit={createCourse}>
            <div className="field">
              <label htmlFor="cname">Course name</label>
              <input id="cname" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} placeholder="e.g. Computer Science — 3rd Semester" />
            </div>
            <div className="field">
              <label htmlFor="cdesc">Description (optional)</label>
              <textarea id="cdesc" className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setCreating(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={busyCreate}>{busyCreate ? 'Creating…' : 'Create course'}</button>
            </div>
          </form>
        </Modal>
      )}

      {review && (
        <SyllabusReviewModal
          structure={review}
          onClose={() => setReview(null)}
          onSaved={(courseId) => { setReview(null); load(); navigate(`/courses/${courseId}`); }}
        />
      )}

      {managing && (
        <Modal title={managing.mode === 'rename' ? 'Rename course' : 'Delete course'} onClose={() => setManaging(null)}>
          {manageErr && <div className="alert alert-error">{manageErr}</div>}
          {managing.mode === 'rename' ? (
            <div className="field">
              <label htmlFor="mname">Course name</label>
              <input id="mname" className="input" value={manageValue} onChange={(e) => setManageValue(e.target.value)} maxLength={200} autoFocus />
            </div>
          ) : (
            <p>Permanently delete <b>{managing.course.name}</b> with all its subjects, lessons and progress? This cannot be undone.</p>
          )}
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setManaging(null)}>Cancel</button>
            <button
              className={`btn ${managing.mode === 'delete' ? 'btn-danger' : 'btn-primary'}`}
              disabled={manageBusy || (managing.mode === 'rename' && !manageValue.trim())}
              onClick={async () => {
                setManageBusy(true);
                setManageErr(null);
                try {
                  if (managing.mode === 'rename') {
                    await api.patch(`/courses/${managing.course.id}`, { name: manageValue.trim() });
                  } else {
                    await api.delete(`/courses/${managing.course.id}`);
                  }
                  setManaging(null);
                  load();
                } catch (e) {
                  setManageErr(e.message);
                } finally {
                  setManageBusy(false);
                }
              }}
            >
              {manageBusy ? 'Working…' : managing.mode === 'rename' ? 'Save' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
