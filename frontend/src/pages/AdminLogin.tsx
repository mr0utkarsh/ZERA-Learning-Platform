import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { Mail, Lock, AlertCircle, ShieldCheck } from 'lucide-react';

export default function AdminLogin() {
  const { adminLogin } = useAuth();
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
      await adminLogin(email, password);
      navigate('/admin');
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
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1 ring-1 ring-violet-500/20 text-xs font-medium text-violet-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Administrator access
          </div>
          <p className="text-sm text-muted mt-3">Sign in with an administrator account.</p>
        </div>

        <div className="card-lift zera-card p-8">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="field-label">Email</label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted shrink-0" />
                <input id="admin-email" className="field-input pl-8" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="field-label">Password</label>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted shrink-0" />
                <input id="admin-password" className="field-input pl-8" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>
            {error && (
              <div className="rounded-xl bg-red-500/10 px-3 py-2.5 ring-1 ring-red-500/20 text-sm text-error flex items-start gap-3">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <button className="btn-primary w-full py-3" disabled={busy}>{busy ? 'Signing in…' : 'Sign in as administrator'}</button>
          </form>
          <p className="mt-6 text-center text-sm text-muted">
            Not an administrator? <Link className="font-medium text-violet-300 hover:underline" to="/login">Student sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
