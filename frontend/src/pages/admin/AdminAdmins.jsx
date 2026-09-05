import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ErrorAlert, PageSpinner, Modal } from '../../components/ui';

const STATUS_BADGES = {
  ACTIVE: ['badge-green', 'Active'],
  SUSPENDED: ['badge-red', 'Revoked'],
  INVITED: ['badge-gold', 'Invited — not yet accepted'],
  PENDING: ['badge-gold', 'Awaiting approval'],
};

export default function AdminAdmins() {
  const { user: me } = useAuth();
  const [admins, setAdmins] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteResult, setInviteResult] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () =>
    api.get('/admin/admins').then((d) => { setAdmins(d.admins); setError(null); }).catch(setError);

  useEffect(() => { load(); }, []);

  if (!admins && !error) return <PageSpinner label="Loading admin team…" />;

  const run = async (fn, successMsg) => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await fn();
      await load();
      if (successMsg) setNotice(successMsg);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const invite = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null); setNotice(null); setInviteResult(null);
    try {
      const d = await api.post('/admin/admins/invite', { name: name.trim(), email: email.trim() });
      setInviteResult(d);
      setName(''); setEmail('');
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const act = (admin, action, msg) =>
    run(() => api.post(`/admin/admins/${admin.id}/${action}`), msg);

  const remove = (admin) =>
    run(() => api.delete(`/admin/admins/${admin.id}`), `Admin account for ${admin.email} deleted`);

  const pendingCount = (admins || []).filter((a) => a.status === 'INVITED' || a.status === 'PENDING').length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Admin team</h1>
          <p className="sub">Invite, approve, and revoke administrator accounts. Only super administrators can manage this.</p>
        </div>
      </div>

      <ErrorAlert error={error} onRetry={load} />
      {notice && <div className="alert alert-success" role="status">✅ {notice}</div>}

      {inviteResult?.devInviteCode && (
        <div className="alert alert-warn" role="status">
          <div>
            <b>Invitation created — share this one-time code with {inviteResult.admin.email}:</b>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 6, margin: '8px 0' }}>{inviteResult.devInviteCode}</div>
            <div className="small">
              SMTP is not configured on this server, so no email was sent. They accept it via “Accept admin invitation” on the login page.
              The code expires in 7 days. Treat it like a password — anyone holding it can set this account’s password.
            </div>
          </div>
        </div>
      )}
      {inviteResult && inviteResult.emailSent && (
        <div className="alert alert-success" role="status">📧 Invitation emailed to {inviteResult.admin.email}. They have 7 days to accept it.</div>
      )}

      {/* Invite form */}
      <form className="card" onSubmit={invite} style={{ maxWidth: 640, marginBottom: 18 }}>
        <h3>Invite a new admin</h3>
        <div className="field">
          <label htmlFor="inv-name">Full name</label>
          <input id="inv-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="inv-email">Email</label>
          <input id="inv-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
          <div className="hint">They’ll set their own password, then you approve the account before it can sign in.</div>
        </div>
        <button className="btn btn-primary" disabled={busy || !name.trim() || !email.trim()}>Send invitation</button>
      </form>

      {/* Roster */}
      <div className="card">
        <h3>Accounts {pendingCount > 0 && <span className="badge badge-gold">{pendingCount} pending</span>}</h3>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }} className="small muted">
              <th style={{ padding: '8px 6px' }}>Name</th>
              <th style={{ padding: '8px 6px' }}>Email</th>
              <th style={{ padding: '8px 6px' }}>Role</th>
              <th style={{ padding: '8px 6px' }}>Status</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(admins || []).map((a) => {
              const [cls, label] = STATUS_BADGES[a.status] || ['badge-gray', a.status];
              const self = a.id === me?.id;
              return (
                <tr key={a.id} style={{ borderTop: '1px solid var(--line-soft)' }}>
                  <td style={{ padding: '10px 6px', fontWeight: 600 }}>{a.name}{self && <span className="small muted"> (you)</span>}</td>
                  <td style={{ padding: '10px 6px' }} className="small">{a.email}</td>
                  <td style={{ padding: '10px 6px' }}>
                    <span className={`badge ${a.role === 'SUPER_ADMIN' ? 'badge-gray' : 'badge-green'}`}>{a.role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin'}</span>
                  </td>
                  <td style={{ padding: '10px 6px' }}><span className={`badge ${cls}`}>{label}</span></td>
                  <td style={{ padding: '10px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {!self && a.role === 'ADMIN' && (
                      <>
                        {a.status === 'PENDING' && <button className="btn btn-success btn-sm" disabled={busy} onClick={() => act(a, 'approve', `${a.name} approved as admin`)}>Approve</button>}
                        {(a.status === 'INVITED' || a.status === 'PENDING') && <button className="btn btn-danger btn-sm" style={{ marginLeft: 6 }} disabled={busy} onClick={() => act(a, 'reject', `Invitation for ${a.email} rejected`)}>Reject</button>}
                        {a.status === 'ACTIVE' && <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => act(a, 'revoke', `Admin access revoked for ${a.email}`)}>Revoke</button>}
                        {a.status === 'SUSPENDED' && (
                          <>
                            <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => act(a, 'restore', `Admin access restored for ${a.email}`)}>Restore</button>
                            <button className="btn btn-danger btn-sm" style={{ marginLeft: 6 }} disabled={busy} onClick={() => setConfirmDelete(a)}>Delete</button>
                          </>
                        )}
                      </>
                    )}
                    {(self || a.role === 'SUPER_ADMIN') && <span className="small muted">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="small muted mb-0" style={{ marginTop: 10 }}>
          Super administrator accounts can’t be revoked or deleted through this page. Revoked admins are blocked immediately, including active sessions.
        </p>
      </div>

      {confirmDelete && (
        <Modal title="Delete admin account" onClose={() => setConfirmDelete(null)}>
          <p>
            Permanently delete the admin account for <b>{confirmDelete.email}</b>? Their account data is removed. This cannot be undone.
          </p>
          <div className="flex" style={{ gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
            <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button className="btn btn-danger" disabled={busy} onClick={() => { const a = confirmDelete; setConfirmDelete(null); remove(a); }}>
              Delete permanently
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
