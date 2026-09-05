import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ErrorAlert } from '../../components/ui';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

export default function AdminLogin() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'accept'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [accepted, setAccepted] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await login(email.trim(), password);
      if (!ADMIN_ROLES.includes(u.role)) {
        setError(new Error('This account does not have administrator access.'));
        setBusy(false);
        return;
      }
      navigate('/admin');
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  const acceptInvite = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/accept-admin-invite', {
        email: email.trim(),
        code: code.trim(),
        password,
        confirmPassword: confirm,
      });
      setAccepted(true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (ADMIN_ROLES.includes(user?.role)) navigate('/admin', { replace: true });
  }, [user, navigate]);

  return (
    <div className="auth-wrap" style={{ background: 'radial-gradient(700px 400px at 50% -10%, rgba(17,24,39,.2), transparent), var(--bg)' }}>
      <div className="auth-card">
        <div className="brand" style={{ justifyContent: 'center', marginBottom: 18 }}>
          <span className="mark" style={{ background: '#111827' }}>Z</span>
          <span>ZERA Admin</span>
        </div>

        {accepted ? (
          <>
            <h1>Invitation accepted ✅</h1>
            <p className="sub">
              Your password is set. A super administrator must approve your account before you can sign in — you’ll be able to use this login once that’s done.
            </p>
            <button className="btn btn-outline btn-block" onClick={() => { setAccepted(false); setMode('login'); setPassword(''); setConfirm(''); setCode(''); }}>
              Back to sign in
            </button>
          </>
        ) : mode === 'login' ? (
          <>
            <h1>Administrator sign in</h1>
            <p className="sub">Restricted area — administrators only.</p>
            <ErrorAlert error={error} />
            <form onSubmit={submit}>
              <div className="field">
                <label htmlFor="a-email">Email</label>
                <input id="a-email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="a-pass">Password</label>
                <input id="a-pass" type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <button className="btn btn-primary btn-block btn-lg" style={{ background: '#111827' }} disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <div className="auth-alt">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setMode('accept'); setError(null); }}>
                Have an admin invitation? Accept it here
              </button>
            </div>
            <div className="auth-alt">
              <Link to="/login">Student login</Link>
            </div>
          </>
        ) : (
          <>
            <h1>Accept admin invitation</h1>
            <p className="sub">Enter the one-time code you received, then choose your password. A super administrator approves your account afterwards.</p>
            <ErrorAlert error={error} />
            <form onSubmit={acceptInvite}>
              <div className="field">
                <label htmlFor="i-email">Email</label>
                <input id="i-email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="i-code">Invitation code</label>
                <input id="i-code" className="input" autoComplete="one-time-code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="i-pass">Choose a password</label>
                <input id="i-pass" type="password" className="input" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                <div className="hint">8–128 characters with letters and numbers.</div>
              </div>
              <div className="field">
                <label htmlFor="i-pass2">Confirm password</label>
                <input id="i-pass2" type="password" className="input" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              <button className="btn btn-primary btn-block btn-lg" style={{ background: '#111827' }} disabled={busy || password !== confirm}>
                {busy ? 'Submitting…' : 'Accept invitation'}
              </button>
            </form>
            <div className="auth-alt">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setMode('login'); setError(null); }}>
                Back to sign in
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
