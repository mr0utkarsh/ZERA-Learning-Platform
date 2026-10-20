import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { api } from '../lib/api';
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

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
    <div className="min-h-screen bg-void text-fg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo variant="primary" className="h-10 mx-auto mb-3" showWordmark />
          <p className="text-sm text-muted">Enter your email to receive a password reset link.</p>
        </div>

        <div className="card-lift zera-card p-8">
          {!success ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="field-label">Email</label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted shrink-0" />
                  <input id="email" className="field-input pl-8" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              {error && (
                <div className="rounded-xl bg-red-500/10 px-3 py-2.5 ring-1 ring-red-500/20 text-sm text-error flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <button className="btn-primary w-full py-3" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm font-medium text-success">Reset link sent</p>
              <p className="text-xs text-muted">If an account exists for this email, a password reset link has been sent. Please check your inbox (and spam folder).</p>
            </div>
          )}
          <p className="mt-6 text-center text-sm text-muted">
            <Link className="font-medium text-violet-300 hover:underline" to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}