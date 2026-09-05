import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import Markdown from '../components/Markdown';
import { ErrorAlert, PageSpinner, EmptyState, Modal } from '../components/ui';
import { fmtDateTime } from '../utils/format';

function HandwrittenView({ note, onClose }) {
  // Rendered with a handwriting font on ruled paper — clearly a styled
  // study sheet, not literal handwriting. Download = print to PDF.
  return (
    <Modal title="Handwritten-style notes" onClose={onClose}>
      <div className="paper" id="paper-sheet">
        <h2>{note.title}</h2>
        <Markdown text={note.content} />
      </div>
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onClose}>Close</button>
        <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Download / Print</button>
      </div>
    </Modal>
  );
}

export default function Notes() {
  const [notes, setNotes] = useState(null);
  const [error, setError] = useState(null);
  const [sheet, setSheet] = useState(null); // handwritten-style preview
  const [openNote, setOpenNote] = useState(null);

  const load = () => {
    setError(null);
    api.get('/notes').then((d) => setNotes(d.notes)).catch(setError);
  };
  useEffect(load, []);

  if (!notes && !error) return <PageSpinner label="Loading notes…" />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Notes</h1>
          <p className="sub">AI-generated notes you saved. Generate new ones from any course, topic or lesson page.</p>
        </div>
      </div>
      <ErrorAlert error={error} onRetry={load} />

      {notes && notes.length === 0 ? (
        <div className="card">
          <EmptyState icon="✍️" title="No notes yet"
            message="Generate AI notes from a subject, unit, chapter, topic or lesson. They will be stored here."
            actionTo="/courses" actionLabel="Choose what to study" />
        </div>
      ) : (
        <div className="grid grid-2">
          {notes.map((n) => (
            <div className="card" key={n.id}>
              <div className="flex-between">
                <h3 className="mb-0">{n.title}</h3>
                <span className={`badge ${n.style === 'HANDWRITTEN' ? 'badge-gold' : ''}`}>
                  {n.style === 'HANDWRITTEN' ? '🖋️ Handwritten-style' : '📄 Standard'}
                </span>
              </div>
              <div className="small muted mt-12">{n.targetType} · {fmtDateTime(n.createdAt)}</div>
              {n.summary && <p className="small mt-12" style={{ marginTop: 10 }}>{n.summary}</p>}
              <div className="flex mt-12" style={{ marginTop: 14 }}>
                <button className="btn btn-outline btn-sm" onClick={() => setOpenNote(n)}>Open</button>
                {n.style === 'HANDWRITTEN' && (
                  <button className="btn btn-outline btn-sm" onClick={() => setSheet(n)}>🖋️ Preview sheet</button>
                )}
                <button className="btn btn-danger btn-sm" onClick={async () => { await api.delete(`/notes/${n.id}`); load(); }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {openNote && (
        <Modal title={openNote.title} onClose={() => setOpenNote(null)}>
          {openNote.keyPoints?.length > 0 && (
            <>
              <b className="small">Key points</b>
              <ul className="small">{openNote.keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul>
            </>
          )}
          <Markdown text={openNote.content} />
          {openNote.importantTerms?.length > 0 && (
            <>
              <hr className="divider" />
              <b className="small">Important terms</b>
              <div>{openNote.importantTerms.map((t, i) => <span className="chip" key={i}>{t}</span>)}</div>
            </>
          )}
        </Modal>
      )}

      {sheet && <HandwrittenView note={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
