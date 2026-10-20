import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-void text-fg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo variant="primary" className="h-10 mx-auto mb-3" showWordmark />
          <p className="text-sm text-muted">Sign in to continue your learning journey.</p>
        </div>

        <div className="card-lift zera-card p-8">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="field-label">Email</label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted shrink-0" />
                <input id="email" className="field-input pl-8" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="relative">
              <label className="field-label">Password</label>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted shrink-0" />
                <input id="password" className="field-input pl-8" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <p className="mt-1 text-right">
                <Link to="/forgot-password" className="text-xs font-medium text-violet-300 hover:underline">Forgot password?</Link>
              </p>
            </div>
            {error && (
              <div className="rounded-xl bg-red-500/10 px-3 py-2.5 ring-1 ring-red-500/20 text-sm text-error flex items-start gap-3">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <button className="btn-primary w-full py-3" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <p className="mt-6 text-center text-sm text-muted">
            New to ZERA? <Link className="font-medium text-violet-300 hover:underline" to="/signup">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
