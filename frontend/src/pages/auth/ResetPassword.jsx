import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Brand } from '../../layouts/PublicLayout';
import { ErrorAlert } from '../../components/ui';

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const devOtp = location.state?.devOtp;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError(new Error('Password must be at least 8 characters and include letters and numbers'));
      return;
    }
    if (password !== confirm) {
      setError(new Error('Passwords do not match'));
      return;
    }
    setBusy(true);
    try {
      // Verify first (keeps the code valid), then reset (consumes it)
      await api.post('/auth/verify-reset-otp', { email: email.trim().toLowerCase(), code: code.trim() });
      await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        password,
        confirmPassword: confirm,
      });
      navigate('/login', { state: { reset: true } });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Brand />
        <h1>Enter reset code</h1>
        <p className="sub">Check your email for the 6-digit code, then choose a new password.</p>
        <ErrorAlert error={error} />
        {devOtp && (
          <div className="alert alert-info" role="note">
            <div>
              Email delivery is not configured on this server, so here is your code:
              <div className="otp-display">{devOtp}</div>
            </div>
          </div>
        )}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="code">Reset code</label>
            <input id="code" className="input" inputMode="numeric" autoComplete="one-time-code"
              style={{ letterSpacing: 6, textAlign: 'center', fontSize: 20 }}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
          </div>
          <div className="field">
            <label htmlFor="pw">New password</label>
            <input id="pw" type="password" className="input" autoComplete="new-password"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="pw2">Confirm new password</label>
            <input id="pw2" type="password" className="input" autoComplete="new-password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <button className="btn btn-primary btn-block btn-lg" disabled={busy || code.length !== 6}>
            {busy ? 'Resetting…' : 'Reset password'}
          </button>
        </form>
        <div className="auth-alt">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
