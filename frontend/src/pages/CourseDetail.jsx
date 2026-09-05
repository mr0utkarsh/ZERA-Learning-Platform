import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { ErrorAlert, PageSpinner, ProgressBar, EmptyState, Modal } from '../components/ui';

function AddInline({ placeholder, onAdd, small }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  if (!open) {
    return <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>+ Add</button>;
  }
  return (
    <form
      className="flex"
      style={{ marginTop: 6 }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!value.trim()) return;
        setBusy(true);
        setErr(null);
        try {
          await onAdd(value.trim());
          setValue('');
          setOpen(false);
        } catch (error) {
          setErr(error.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <input className="input" style={{ padding: '7px 10px', fontSize: 13.5, maxWidth: small ? 240 : 340 }}
        value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} autoFocus aria-label={placeholder} />
      <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? '…' : 'Add'}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      {err && <span className="small" style={{ color: 'var(--danger)' }}>{err}</span>}
    </form>
  );
}

function Node({ level, node, editable, refresh }) {
  const [open, setOpen] = useState(level <= 1);

  const childPath = { subject: 'subjects', unit: 'units', chapter: 'chapters', topic: 'topics' }[level];
  const childLabel = { subject: 'Unit name', unit: 'Chapter name', chapter: 'Topic name', topic: 'Lesson title' }[level];

  const onRename = editable ? () => refresh({ type: 'rename', level, node }) : undefined;
  const onDelete = editable ? () => refresh({ type: 'delete', level, node }) : undefined;

  const meta = `${node.completed}/${node.lessonCount} lessons`;
  return (
    <div className={`tree-node${open ? ' open' : ''}`}>
      <div className="tree-head" onClick={() => setOpen(!open)} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); } }}>
        <span className="chev">▶</span>
        <span className="name">{node.name}{node.code ? <span className="badge badge-gray" style={{ marginLeft: 8 }}>{node.code}</span> : null}{node.important ? <span className="badge badge-gold" style={{ marginLeft: 8 }}>important</span> : null}</span>
        <span className="meta">{node.lessonCount > 0 ? meta : ''}</span>
        <div style={{ width: 110 }} onClick={(e) => e.stopPropagation()}>
          <ProgressBar value={node.progress} green={node.progress === 100} showLabel={false} />
        </div>
        <span className="badge" style={{ minWidth: 46, justifyContent: 'center' }}>{node.progress}%</span>
        {editable && (
          <span className="flex" style={{ gap: 2 }} onClick={(e) => e.stopPropagation()}>
            <button className="btn btn-ghost btn-sm" aria-label={`Rename ${node.name}`} title="Rename" onClick={onRename}>✏️</button>
            <button className="btn btn-ghost btn-sm" aria-label={`Delete ${node.name}`} title="Delete" onClick={onDelete}>🗑</button>
          </span>
        )}
      </div>
      {open && (
        <div className="tree-body">
          {level === 'subject' && (node.units || []).map((u) => (
            <Node key={u.id} level="unit" node={u} editable={editable} refresh={refresh} />
          ))}
          {level === 'unit' && (node.chapters || []).map((c) => (
            <Node key={c.id} level="chapter" node={c} editable={editable} refresh={refresh} />
          ))}
          {level === 'chapter' && (node.topics || []).map((t) => (
            <Node key={t.id} level="topic" node={t} editable={editable} refresh={refresh} />
          ))}
          {level === 'topic' && (node.lessons || []).map((l) => (
            <div className="lesson-row" key={l.id}>
              <span className={`check${l.completed ? ' done' : ''}`} aria-hidden="true">{l.completed ? '✓' : ''}</span>
              <Link to={`/lessons/${l.id}`}>{l.title}</Link>
              {editable && (
                <span className="flex" style={{ gap: 2 }}>
                  <button className="btn btn-ghost btn-sm" aria-label={`Edit lesson ${l.title}`} title="Edit"
                    onClick={() => refresh({ type: 'editLesson', node: l })}>✏️</button>
                  <button className="btn btn-ghost btn-sm" aria-label={`Delete lesson ${l.title}`} title="Delete"
                    onClick={() => refresh({ type: 'delete', level: 'lesson', node: l })}>🗑</button>
                </span>
              )}
            </div>
          ))}
          {editable && childPath && (
            <AddInline placeholder={childLabel} onAdd={async (v) => {
              await api.post(`/courses/${childPath}/${node.id}/${{ subject: 'units', unit: 'chapters', chapter: 'topics', topic: 'lessons' }[level]}`, { name: v, title: level === 'topic' ? v : undefined });
              refresh();
            }} />
          )}
        </div>
      )}
    </div>
  );
}

export default function CourseDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [dialog, setDialog] = useState(null); // {type:'rename'|'delete'|'editLesson'|'renameCourse', level?, node?}
  const [dialogValue, setDialogValue] = useState('');
  const [dialogContent, setDialogContent] = useState('');
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogErr, setDialogErr] = useState(null);

  const load = () => {
    setError(null);
    api.get(`/courses/${id}`).then(setData).catch(setError);
  };
  useEffect(load, [id]);

  if (!data && !error) return <PageSpinner label="Loading course…" />;

  const openDialog = (action) => {
    setDialogErr(null);
    setDialogBusy(false);
    if (action.type === 'rename') setDialogValue(action.node.name);
    if (action.type === 'renameCourse') setDialogValue(data.course.name);
    if (action.type === 'editLesson') {
      // fetch full lesson (content/objectives) for editing
      api.get(`/courses/lessons/${action.node.id}`).then((d) => {
        setDialogValue(d.lesson.title);
        setDialogContent(d.lesson.content || '');
        setDialog({ ...action, objectives: (d.lesson.objectives || []).join('\n') });
      }).catch((e) => setError(e));
      return;
    }
    setDialog(action);
  };

  const apiFor = { subject: 'subjects', unit: 'units', chapter: 'chapters', topic: 'topics', lesson: 'lessons' };

  const confirmDialog = async () => {
    setDialogBusy(true);
    setDialogErr(null);
    try {
      if (dialog.type === 'rename') {
        await api.patch(`/courses/${apiFor[dialog.level]}/${dialog.node.id}`, { name: dialogValue.trim() });
      } else if (dialog.type === 'renameCourse') {
        await api.patch(`/courses/${id}`, { name: dialogValue.trim() });
      } else if (dialog.type === 'delete') {
        await api.delete(`/courses/${apiFor[dialog.level]}/${dialog.node.id}`);
      } else if (dialog.type === 'deleteCourse') {
        await api.delete(`/courses/${id}`);
        window.location.href = '/courses';
        return;
      } else if (dialog.type === 'editLesson') {
        await api.patch(`/courses/lessons/${dialog.node.id}`, {
          title: dialogValue.trim(),
          content: dialogContent,
          objectives: (dialog.objectives || '').split('\n').map((s) => s.trim()).filter(Boolean),
        });
      }
      setDialog(null);
      load();
    } catch (e) {
      setDialogErr(e.message);
    } finally {
      setDialogBusy(false);
    }
  };

  const editable = true;

  return (
    <div className="page">
      <ErrorAlert error={error} onRetry={load} />
      {data && (
        <>
          <div className="breadcrumbs" aria-label="Breadcrumb">
            <Link to="/courses">My Courses</Link><span className="sep">/</span><span>{data.course.name}</span>
          </div>
          <div className="page-head">
            <div>
              <h1>{data.course.name}</h1>
              <p className="sub">{data.course.description || 'No description'}</p>
            </div>
            <div className="flex">
              <button className="btn btn-outline btn-sm" onClick={() => openDialog({ type: 'renameCourse' })}>✏️ Rename</button>
              <button className="btn btn-danger btn-sm" onClick={() => openDialog({ type: 'deleteCourse' })}>🗑 Delete course</button>
            </div>
          </div>
          <div style={{ maxWidth: 360, marginBottom: 18 }}>
            <ProgressBar value={data.progress} green={data.progress === 100} label="Course progress" />
          </div>

          {data.subjects.length === 0 ? (
            <div className="card">
              <EmptyState icon="🧱" title="This course is empty" message="Add your first subject to start building the structure." />
              <div style={{ textAlign: 'center' }}>
                <AddInline placeholder="Subject name" onAdd={async (v) => { await api.post(`/courses/${id}/subjects`, { name: v }); load(); }} />
              </div>
            </div>
          ) : (
            <>
              {data.subjects.map((s) => (
                <Node key={s.id} level="subject" node={s} editable={editable} refresh={(a) => (a ? openDialog(a) : load())} />
              ))}
              <div className="mt-20">
                <AddInline placeholder="New subject name" onAdd={async (v) => { await api.post(`/courses/${id}/subjects`, { name: v }); load(); }} />
              </div>
            </>
          )}
        </>
      )}

      {dialog && (
        <Modal
          title={dialog.type === 'rename' ? `Rename ${dialog.level}` : dialog.type === 'renameCourse' ? 'Rename course' : dialog.type === 'deleteCourse' ? 'Delete course' : dialog.type === 'editLesson' ? 'Edit lesson' : `Delete ${dialog.level || ''}`.trim()}
          onClose={() => setDialog(null)}
        >
          {dialogErr && <div className="alert alert-error">{dialogErr}</div>}
          {(dialog.type === 'rename' || dialog.type === 'renameCourse') && (
            <div className="field">
              <label htmlFor="rn">New name</label>
              <input id="rn" className="input" value={dialogValue} onChange={(e) => setDialogValue(e.target.value)} autoFocus maxLength={300} />
            </div>
          )}
          {dialog.type === 'editLesson' && (
            <>
              <div className="field">
                <label htmlFor="lt">Lesson title</label>
                <input id="lt" className="input" value={dialogValue} onChange={(e) => setDialogValue(e.target.value)} maxLength={300} />
              </div>
              <div className="field">
                <label htmlFor="lc">Content (Markdown supported)</label>
                <textarea id="lc" className="textarea" rows={8} value={dialogContent} onChange={(e) => setDialogContent(e.target.value)} maxLength={20000} />
              </div>
              <div className="field">
                <label htmlFor="lo">Learning objectives (one per line)</label>
                <textarea id="lo" className="textarea" rows={3} value={dialog.objectives || ''} onChange={(e) => setDialog((d) => ({ ...d, objectives: e.target.value }))} />
              </div>
            </>
          )}
          {(dialog.type === 'delete' || dialog.type === 'deleteCourse') && (
            <p>
              Permanently delete <b>{dialog.node?.name || data?.course?.name}</b>
              {dialog.level === 'lesson' ? '' : ' and everything inside it'}?
              Completed-lesson history for removed lessons is also removed. This cannot be undone.
            </p>
          )}
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setDialog(null)}>Cancel</button>
            <button
              className={`btn ${dialog.type.startsWith('delete') ? 'btn-danger' : 'btn-primary'}`}
              onClick={confirmDialog}
              disabled={dialogBusy || ((dialog.type === 'rename' || dialog.type === 'renameCourse') && !dialogValue.trim()) || (dialog.type === 'editLesson' && !dialogValue.trim())}
            >
              {dialogBusy ? 'Working…' : dialog.type.startsWith('delete') ? 'Delete' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
