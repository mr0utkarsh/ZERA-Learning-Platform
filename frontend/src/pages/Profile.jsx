import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ErrorAlert, Avatar } from '../components/ui';
import { fmtDate } from '../utils/format';

const COLORS = ['#6c5ce7', '#00b894', '#0984e3', '#e17055', '#d63031', '#fdcb6e', '#e84393', '#2d3436'];

export default function Profile() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    institution: user?.institution || '',
    gradeLevel: user?.gradeLevel || '',
    avatarColor: user?.avatarColor || '#6c5ce7',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);
  const [pwErr, setPwErr] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      await api.patch('/users/profile', form);
      await refresh();
      setMsg('Profile updated.');
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwErr(null);
    setPwMsg(null);
    if (pw.newPassword !== pw.confirm) {
      setPwErr(new Error('New passwords do not match'));
      return;
    }
    setPwBusy(true);
    try {
      await api.post('/users/change-password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPwMsg('Password changed successfully.');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setPwErr(err);
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="page-head">
        <div>
          <h1>Profile</h1>
          <p className="sub">Member since {fmtDate(user?.createdAt)} · {user?.emailVerified ? 'Email verified ✓' : 'Email not verified'}</p>
        </div>
      </div>

      <div className="card mb-12">
        <div className="flex mb-12">
          <Avatar name={form.name} color={form.avatarColor} size={56} />
          <div>
            <b>{user?.email}</b>
            <div className="small muted">{user?.role === 'STUDENT' ? 'Student account' : 'Account'}</div>
          </div>
        </div>
        <ErrorAlert error={error} />
        {msg && <div className="alert alert-success">{msg}</div>}
        <form onSubmit={save}>
          <div className="field">
            <label htmlFor="p-name">Full name</label>
            <input id="p-name" className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required minLength={2} maxLength={80} />
          </div>
          <div className="field">
            <label htmlFor="p-bio">Bio</label>
            <textarea id="p-bio" className="textarea" rows={2} value={form.bio} maxLength={500} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Tell us about your goals…" />
          </div>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="p-inst">Institution</label>
              <input id="p-inst" className="input" value={form.institution} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))} />
            </div>
            <div className="field">
              <label htmlFor="p-grade">Grade / level</label>
              <input id="p-grade" className="input" value={form.gradeLevel} maxLength={100} onChange={(e) => setForm((f) => ({ ...f, gradeLevel: e.target.value }))} placeholder="e.g. 2nd year B.Tech" />
            </div>
          </div>
          <div className="field">
            <label>Avatar color</label>
            <div className="flex">
              {COLORS.map((c) => (
                <button type="button" key={c} onClick={() => setForm((f) => ({ ...f, avatarColor: c }))}
                  aria-label={`Choose color ${c}`}
                  style={{ width: 30, height: 30, borderRadius: '50%', background: c, border: form.avatarColor === c ? '3px solid var(--ink)' : '3px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </form>
      </div>

      <div className="card">
        <h3>Change password</h3>
        <ErrorAlert error={pwErr} />
        {pwMsg && <div className="alert alert-success">{pwMsg}</div>}
        <form onSubmit={changePassword}>
          <div className="field">
            <label htmlFor="pw-cur">Current password</label>
            <input id="pw-cur" type="password" className="input" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} required />
          </div>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="pw-new">New password</label>
              <input id="pw-new" type="password" className="input" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} required />
            </div>
            <div className="field">
              <label htmlFor="pw-conf">Confirm new password</label>
              <input id="pw-conf" type="password" className="input" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} required />
            </div>
          </div>
          <button className="btn btn-primary" disabled={pwBusy}>{pwBusy ? 'Changing…' : 'Change password'}</button>
        </form>
      </div>
    </div>
  );
}
