import { FormEvent, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { api } from '../lib/api';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const [strength, setStrength] = useState(0);

  const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#16a34a'];

  const evaluateStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (pw.length >= 12) score += 1;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
    if (/\d/.test(pw)) score += 1;
    if (/[^A-Za-z\d]/.test(pw)) score += 1;
    return score;
  };

  useEffect(() => {
    setStrength(evaluateStrength(password));
  }, [password]);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token.');
      setTokenValid(false);
    }
  }, [token]);

  const passwordsMatch = password === confirmPassword && password.length > 0;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) return;
    if (!passwordsMatch) {
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
      <div className="min-h-screen bg-void text-fg flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <Logo variant="primary" className="h-10 mx-auto mb-4" showWordmark />
          <div className="rounded-xl bg-red-500/10 px-3 py-2.5 ring-1 ring-red-500/20 text-sm text-error inline-block">
            <AlertCircle className="h-4 w-4 inline mr-1.5" />
            {error}
          </div>
          <p className="mt-4 text-sm text-muted">
            <Link className="font-medium text-violet-300 hover:underline" to="/forgot-password">Request a new reset link</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void text-fg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo variant="primary" className="h-10 mx-auto mb-3" showWordmark />
          <p className="text-sm text-muted">Create a new password for your ZERA account.</p>
        </div>

        <div className="card-lift zera-card p-8">
          {!success ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="relative">
                <label className="field-label">New password</label>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted shrink-0" />
                  <input
                    id="password"
                    className="field-input pl-8 pr-10"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 p-1 text-muted hover:text-fg"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-1">
                  <div className="flex gap-1 h-1.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-md transition-colors ${i < strength ? strengthColors[strength] : 'bg-muted'}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-1">{strength > 0 ? strengthLabels[strength - 1] : ''}</p>
                </div>
                <p className="text-xs text-muted">At least 8 characters.</p>
              </div>
              <div className="relative">
                <label className="field-label">Confirm new password</label>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted shrink-0" />
                  <input
                    id="confirmPassword"
                    className="field-input pl-8 pr-10"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 p-1 text-muted hover:text-fg"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {!passwordsMatch && password.length > 0 && (
                  <p className="text-xs text-error">Passwords do not match.</p>
                )}
              </div>
              {error && (
                <div className="rounded-xl bg-red-500/10 px-3 py-2.5 ring-1 ring-red-500/20 text-sm text-error flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <button className="btn-primary w-full py-3" disabled={busy}>
                {busy ? 'Resetting…' : 'Reset password'}
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/10 mx-auto">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm font-medium text-success">Your password has been reset successfully.</p>
              <Link to="/login" className="btn-primary w-full block py-3 text-center">Sign in with new password</Link>
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