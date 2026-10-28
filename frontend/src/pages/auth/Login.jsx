import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ErrorAlert } from '../../components/ui';
import { AuthDivider, AuthShell } from '../../components/auth/AuthShell';
import SocialAuth from '../../components/auth/SocialAuth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [oauthNotice, setOauthNotice] = useState(null);

  React.useEffect(() => {
    const code = new URLSearchParams(location.search).get('oauth_error');
    const messages = {
      not_configured: { tone: 'warn', text: 'Social sign-in is not configured yet. Please use your email and password.' },
      cancelled: { tone: 'info', text: 'Sign-in was cancelled. You can try again or use your email and password.' },
      invalid_state: { tone: 'error', text: 'We could not verify that sign-in request. Please try again.' },
      account_unavailable: { tone: 'error', text: 'This email is linked to an unavailable account. Please contact support.' },
      unsupported_provider: { tone: 'error', text: 'That sign-in provider is not supported.' },
      failed: { tone: 'error', text: 'Social sign-in could not be completed. Please try again or use your email.' },
    };
    setOauthNotice(messages[code] || null);
  }, [location.search]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOauthNotice(null);
    try {
      const user = await login(email.trim(), password);
      navigate(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell mode="login">
      <div className="auth-form-heading">
        <span className="auth-mobile-mark">Z</span>
        <span className="auth-form-eyebrow">WELCOME BACK</span>
        <h1>Let’s pick up<br className="auth-heading-break" /> where you left off.</h1>
        <p>Your next focused session is just around the corner.</p>
      </div>

      <SocialAuth mode="login" />
      <AuthDivider />
      {oauthNotice && <div className={`alert alert-${oauthNotice.tone}`} role="status">{oauthNotice.text}</div>}
      <ErrorAlert error={error} />

      <form onSubmit={submit} className="auth-form">
        <div className="field auth-field">
          <label htmlFor="email">Email address</label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg></span>
            <input id="email" type="email" className="input" autoComplete="email" inputMode="email" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        </div>
        <div className="field auth-field">
          <div className="auth-label-row"><label htmlFor="password">Password</label><Link to="/forgot-password">Forgot password?</Link></div>
          <div className="auth-input-wrap">
            <span className="auth-input-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span>
            <input id="password" type={showPassword ? 'text' : 'password'} className="input" autoComplete="current-password" placeholder="Enter your password"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="auth-show-password" type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
          </div>
        </div>
        <button className="btn btn-primary btn-block btn-lg auth-submit" disabled={busy}>
          {busy ? <><span className="auth-button-spinner" /> Signing in…</> : <>Sign in <span aria-hidden="true">→</span></>}
        </button>
      </form>

      <p className="auth-switch">New to ZERA? <Link to="/signup">Create your free account <span aria-hidden="true">→</span></Link></p>
      <div className="auth-admin-link"><Link to="/admin/login">Signing in as an administrator?</Link></div>
    </AuthShell>
  );
}
