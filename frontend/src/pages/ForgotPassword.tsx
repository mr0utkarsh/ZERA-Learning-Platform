import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { api } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.auth.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Could not send reset link. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="card w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <Logo />
          <p className="mt-2 text-sm text-slate-500">Enter your email to receive a password reset link.</p>
        </div>
        {!success ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-green-700">If an account exists for this email, a password reset link has been sent.</p>
            <p className="text-sm text-slate-500">Please check your inbox (and spam folder) for the reset email.</p>
          </div>
        )}
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link className="font-medium text-brand-600 hover:underline" to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}