import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ErrorAlert } from '../../components/ui';
import { AuthDivider, AuthShell } from '../../components/auth/AuthShell';
import SocialAuth from '../../components/auth/SocialAuth';

const validate = (f) => {
  const errors = {};
  if (f.name.trim().length < 2) errors.name = 'Please enter your full name (at least 2 characters)';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) errors.email = 'Please enter a valid email address';
  if (f.password.length < 8) errors.password = 'Password must be at least 8 characters';
  else if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) errors.password = 'Password must include letters and numbers';
  if (f.confirmPassword !== f.password) errors.confirmPassword = 'Passwords do not match';
  return errors;
};

function PasswordRules({ password }) {
  const rules = [
    [password.length >= 8, '8+ characters'],
    [/[A-Za-z]/.test(password), 'One letter'],
    [/\d/.test(password), 'One number'],
  ];
  return <div className="password-rules" aria-label="Password requirements">{rules.map(([passed, label]) => <span className={passed ? 'passed' : ''} key={label}><i>{passed ? '✓' : '·'}</i>{label}</span>)}</div>;
}

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
    if (errors[k]) setErrors((old) => ({ ...old, [k]: '' }));
  };

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

  const inputCls = (key) => `input${errors[key] ? ' invalid' : ''}`;

  return (
    <AuthShell mode="signup">
      <div className="auth-form-heading auth-signup-heading">
        <span className="auth-mobile-mark">Z</span>
        <span className="auth-form-eyebrow">A FRESH START</span>
        <h1>Your goals deserve<br className="auth-heading-break" /> a good plan.</h1>
        <p>Create your free account and make learning feel more focused.</p>
      </div>

      <SocialAuth mode="signup" />
      <AuthDivider />
      <ErrorAlert error={error} />

      <form onSubmit={submit} className="auth-form" noValidate>
        <div className="field auth-field">
          <label htmlFor="name">Full name</label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></span>
            <input id="name" className={inputCls('name')} autoComplete="name" placeholder="Your name"
              value={form.name} onChange={set('name')} aria-invalid={!!errors.name} required />
          </div>
          {errors.name && <div className="field-error" role="alert">{errors.name}</div>}
        </div>
        <div className="field auth-field">
          <label htmlFor="email">Email address</label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg></span>
            <input id="email" type="email" className={inputCls('email')} autoComplete="email" inputMode="email" placeholder="you@example.com"
              value={form.email} onChange={set('email')} aria-invalid={!!errors.email} required />
          </div>
          {errors.email && <div className="field-error" role="alert">{errors.email}</div>}
        </div>
        <div className="field auth-field">
          <label htmlFor="password">Create a password</label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span>
            <input id="password" type={showPassword ? 'text' : 'password'} className={inputCls('password')} autoComplete="new-password" placeholder="At least 8 characters"
              value={form.password} onChange={set('password')} aria-invalid={!!errors.password} required />
            <button className="auth-show-password" type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
          </div>
          <PasswordRules password={form.password} />
          {errors.password && <div className="field-error" role="alert">{errors.password}</div>}
        </div>
        <div className="field auth-field">
          <label htmlFor="confirm">Confirm password</label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="10"/></svg></span>
            <input id="confirm" type={showConfirm ? 'text' : 'password'} className={inputCls('confirmPassword')} autoComplete="new-password" placeholder="Enter your password again"
              value={form.confirmPassword} onChange={set('confirmPassword')} aria-invalid={!!errors.confirmPassword} required />
            <button className="auth-show-password" type="button" onClick={() => setShowConfirm((shown) => !shown)} aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}>{showConfirm ? 'Hide' : 'Show'}</button>
          </div>
          {errors.confirmPassword && <div className="field-error" role="alert">{errors.confirmPassword}</div>}
        </div>
        <button className="btn btn-primary btn-block btn-lg auth-submit" disabled={busy}>
          {busy ? <><span className="auth-button-spinner" /> Creating account…</> : <>Create free account <span aria-hidden="true">→</span></>}
        </button>
      </form>

      <p className="auth-switch">Already have an account? <Link to="/login">Sign in <span aria-hidden="true">→</span></Link></p>
    </AuthShell>
  );
}
