import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Brand } from '../../layouts/PublicLayout';
import { ErrorAlert } from '../../components/ui';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const d = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      navigate('/reset-password', { state: { email: email.trim().toLowerCase(), devOtp: d?.devOtp } });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Brand />
        <h1>Reset your password</h1>
        <p className="sub">Enter your account email and we’ll send you a one-time reset code.</p>
        <ErrorAlert error={error} />
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" className="input" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {busy ? 'Sending code…' : 'Send reset code'}
          </button>
        </form>
        <div className="auth-alt">
          Remembered it? <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
