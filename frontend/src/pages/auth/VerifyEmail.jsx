import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Brand } from '../../layouts/PublicLayout';
import { ErrorAlert } from '../../components/ui';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const devOtp = location.state?.devOtp;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/verify-email', { code: code.trim() });
      await refresh();
      navigate('/dashboard');
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError(null);
    setInfo(null);
    try {
      const d = await api.post('/auth/resend-email-otp');
      setInfo('A new code has been sent.');
      if (d?.devOtp) {
        navigate('/verify-email', { state: { devOtp: d.devOtp }, replace: true });
      }
    } catch (err) {
      setError(err);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Brand />
        <h1>Verify your email</h1>
        <p className="sub">We sent a 6-digit code to your email address. Enter it below to activate your account.</p>
        <ErrorAlert error={error} />
        {info && <div className="alert alert-success">{info}</div>}
        {devOtp && (
          <div className="alert alert-info" role="note">
            <div>
              Email delivery is not configured on this server, so here is your code:
              <div className="otp-display" aria-label="Verification code">{devOtp}</div>
            </div>
          </div>
        )}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="code">Verification code</label>
            <input id="code" className="input" inputMode="numeric" autoComplete="one-time-code"
              style={{ letterSpacing: 6, textAlign: 'center', fontSize: 20 }}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
          </div>
          <button className="btn btn-primary btn-block btn-lg" disabled={busy || code.length !== 6}>
            {busy ? 'Verifying…' : 'Verify email'}
          </button>
        </form>
        <div className="auth-alt">
          Didn’t get it?{' '}
          <button className="btn btn-ghost btn-sm" onClick={resend} disabled={resending}>
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        </div>
        <div className="auth-alt">
          <Link to="/dashboard">Skip for now (verify later)</Link>
        </div>
      </div>
    </div>
  );
}
