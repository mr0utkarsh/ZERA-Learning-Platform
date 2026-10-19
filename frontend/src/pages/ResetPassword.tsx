import { FormEvent, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { api } from '../lib/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token.');
      setTokenValid(false);
    }
  }, [token]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) return;
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      await api.auth.resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Could not reset password. The link may have expired or already been used.');
    } finally {
      setBusy(false);
    }
  };

  if (!tokenValid && !success) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <div className="card w-full max-w-md text-center">
          <Logo className="mb-4" />
          <p className="text-red-700">{error}</p>
          <p className="mt-4 text-sm text-slate-500">
            <Link className="font-medium text-brand-600 hover:underline" to="/forgot-password">Request a new reset link</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="card w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <Logo />
          <p className="mt-2 text-sm text-slate-500">Create a new password for your ZERA account.</p>
        </div>
        {!success ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="password">New password</label>
              <input id="password" className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
            </div>
            <div>
              <label className="label" htmlFor="confirmPassword">Confirm new password</label>
              <input id="confirmPassword" className="input" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Resetting…' : 'Reset password'}</button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-green-700">Your password has been reset successfully.</p>
            <Link to="/login" className="btn-primary w-full block">Sign in with new password</Link>
          </div>
        )}
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link className="font-medium text-brand-600 hover:underline" to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}