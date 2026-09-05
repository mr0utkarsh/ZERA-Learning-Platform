import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { ErrorAlert, PageSpinner, EmptyState, Modal, Avatar } from '../../components/ui';
import { fmtDate, fmtMinutes } from '../../utils/format';

function StudentDetail({ studentId, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/admin/students/${studentId}`).then(setData).catch(setError);
  }, [studentId]);

  if (error) return <Modal title="Error" onClose={onClose}><ErrorAlert error={error} /></Modal>;
  if (!data) return <Modal title="Loading…" onClose={onClose}><PageSpinner /></Modal>;

  const s = data.student;
  const a = data.activity;

  return (
    <Modal title="Student details" onClose={onClose}>
      <div className="flex mb-12">
        <Avatar name={s.name} size={48} />
        <div>
          <b style={{ fontSize: 17 }}>{s.name}</b>
          <div className="small muted">{s.email} · joined {fmtDate(s.createdAt)}</div>
          <div className="flex mt-12" style={{ gap: 6 }}>
            <span className={`badge ${s.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>{s.status}</span>
            {s.emailVerified ? <span className="badge badge-gray">Email verified</span> : <span className="badge badge-gold">Email unverified</span>}
          </div>
        </div>
      </div>
      {(s.institution || s.gradeLevel || s.bio) && (
        <div className="small muted mb-12">
          {s.institution && <div>🏫 {s.institution}</div>}
          {s.gradeLevel && <div>🎓 {s.gradeLevel}</div>}
          {s.bio && <div style={{ marginTop: 6 }}>{s.bio}</div>}
        </div>
      )}
      <hr className="divider" />
      <div className="grid grid-2 mb-12">
        <div className="stat-card"><div className="label">Lessons completed</div><div className="value">{a.completedLessons}</div></div>
        <div className="stat-card"><div className="label">Study time</div><div className="value">{fmtMinutes(a.studyMinutes)}</div></div>
      </div>
      <b className="small">Courses ({a.courses.length})</b>
      {a.courses.length === 0 ? <p className="small muted">None yet.</p> : (
        <ul className="small">{a.courses.map((c) => <li key={c.id}>{c.name}</li>)}</ul>
      )}
      <b className="small">Recent attempts</b>
      {a.attempts.length === 0 ? <p className="small muted">No quiz/test attempts yet.</p> : (
        <div className="table-wrap mt-12" style={{ maxHeight: 180, overflowY: 'auto' }}>
          <table className="data">
            <thead><tr><th>Title</th><th>%</th></tr></thead>
            <tbody>
              {a.attempts.map((x, i) => (
                <tr key={i}><td className="small">{x.quiz.title}</td><td>{x.percentage}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="modal-actions">
        {s.status === 'ACTIVE' ? (
          <button className="btn btn-danger" onClick={async () => { await api.post(`/admin/students/${s.id}/suspend`); onChanged(); onClose(); }}>Suspend account</button>
        ) : (
          <button className="btn btn-success" onClick={async () => { await api.post(`/admin/students/${s.id}/restore`); onChanged(); onClose(); }}>Restore account</button>
        )}
        <button className="btn btn-outline" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

export default function AdminStudents() {
  const [filters, setFilters] = useState({ q: '', status: '' });
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = (p = page) => {
    setError(null);
    const params = new URLSearchParams({ page: String(p), limit: '10' });
    if (filters.q) params.set('q', filters.q);
    if (filters.status) params.set('status', filters.status);
    api.get(`/admin/students?${params.toString()}`).then(setData).catch(setError);
  };
  useEffect(() => { load(1); setPage(1); }, [filters.q, filters.status]); // eslint-disable-line

  const action = async (student, kind) => {
    try {
      if (kind === 'suspend') await api.post(`/admin/students/${student.id}/suspend`);
      if (kind === 'restore') await api.post(`/admin/students/${student.id}/restore`);
      if (kind === 'delete') await api.delete(`/admin/students/${student.id}`);
      setConfirmDelete(null);
      load();
    } catch (e) {
      setError(e);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Students</h1>
          <p className="sub">Search, inspect, suspend, restore or remove student accounts.</p>
        </div>
      </div>
      <ErrorAlert error={error} />

      <div className="card card-tight mb-12" style={{ marginBottom: 16 }}>
        <div className="flex">
          <input className="input" style={{ maxWidth: 320 }} placeholder="Search name or email…" value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} aria-label="Search students" />
          <select className="select" style={{ maxWidth: 180 }} value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          {data && <span className="small muted">{data.total} student(s)</span>}
        </div>
      </div>

      {!data && !error ? <PageSpinner label="Loading students…" /> : data.students.length === 0 ? (
        <div className="card"><EmptyState icon="🧑‍🎓" title="No students found" message="Adjust your search or filters." /></div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Student</th><th>Status</th><th>Verified</th><th>Courses</th><th>Attempts</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {data.students.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="flex">
                      <Avatar name={s.name} size={32} />
                      <div>
                        <b>{s.name}</b>
                        <div className="small muted">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge ${s.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>{s.status}</span></td>
                  <td>{s.emailVerified ? '✓' : '—'}</td>
                  <td>{s._count.courses}</td>
                  <td>{s._count.quizAttempts}</td>
                  <td className="small muted nowrap">{fmtDate(s.createdAt)}</td>
                  <td>
                    <div className="flex" style={{ gap: 6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setDetail(s.id)}>View</button>
                      {s.status === 'ACTIVE' ? (
                        <button className="btn btn-danger btn-sm" onClick={() => action(s, 'suspend')}>Suspend</button>
                      ) : (
                        <button className="btn btn-success btn-sm" onClick={() => action(s, 'restore')}>Restore</button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(s)} aria-label={`Remove ${s.name}`}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > 10 && (
        <div className="flex mt-12" style={{ justifyContent: 'center' }}>
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => { setPage(page - 1); load(page - 1); }}>← Prev</button>
          <span className="small muted">Page {page} of {Math.ceil(data.total / 10)}</span>
          <button className="btn btn-outline btn-sm" disabled={page >= Math.ceil(data.total / 10)} onClick={() => { setPage(page + 1); load(page + 1); }}>Next →</button>
        </div>
      )}

      {detail && <StudentDetail studentId={detail} onClose={() => setDetail(null)} onChanged={() => load()} />}

      {confirmDelete && (
        <Modal title="Remove student account" onClose={() => setConfirmDelete(null)}>
          <p>
            Permanently remove <b>{confirmDelete.name}</b> ({confirmDelete.email})?
            This deletes their courses, progress, attempts and plans. This cannot be undone.
          </p>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => action(confirmDelete, 'delete')}>Remove account</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
