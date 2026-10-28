import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Brand } from '../../layouts/PublicLayout';
import { ErrorAlert } from '../../components/ui';

const validate = (f) => {
  const errors = {};
  if (f.name.trim().length < 2) errors.name = 'Please enter your full name (at least 2 characters)';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) errors.email = 'Please enter a valid email address';
  if (f.password.length < 8) errors.password = 'Password must be at least 8 characters';
  else if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) errors.password = 'Password must include letters and numbers';
  if (f.confirmPassword !== f.password) errors.confirmPassword = 'Passwords do not match';
  return errors;
};

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setError(null);
    try {
      const data = await signup({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      navigate('/verify-email', { state: { devOtp: data.devOtp } });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  const inputCls = (k) => `input${errors[k] ? ' invalid' : ''}`;

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Brand />
        <h1>Create your account</h1>
        <p className="sub">Start your new era of learning — it’s free</p>
        <ErrorAlert error={error} />
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" className={inputCls('name')} autoComplete="name"
              value={form.name} onChange={set('name')} aria-invalid={!!errors.name} />
            {errors.name && <div className="field-error" role="alert">{errors.name}</div>}
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" className={inputCls('email')} autoComplete="email"
              value={form.email} onChange={set('email')} aria-invalid={!!errors.email} />
            {errors.email && <div className="field-error" role="alert">{errors.email}</div>}
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" className={inputCls('password')} autoComplete="new-password"
              value={form.password} onChange={set('password')} aria-invalid={!!errors.password} />
            <div className="hint">At least 8 characters with letters and numbers.</div>
            {errors.password && <div className="field-error" role="alert">{errors.password}</div>}
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirm password</label>
            <input id="confirm" type="password" className={inputCls('confirmPassword')} autoComplete="new-password"
              value={form.confirmPassword} onChange={set('confirmPassword')} aria-invalid={!!errors.confirmPassword} />
            {errors.confirmPassword && <div className="field-error" role="alert">{errors.confirmPassword}</div>}
          </div>
          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <div className="auth-alt">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
