import { FormEvent, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
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

  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isFormValid = name.length >= 2 && password.length >= 8 && passwordsMatch;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isFormValid) {
      setError('Please fix the fields above.');
      return;
    }
    setBusy(true);
    try {
      await signup(name, email, password);
      navigate('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/oauth/${provider}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.message || `${provider} sign-in is not configured.`);
          return;
        }
        const data = await res.json();
        window.location.href = data.authorizationUrl;
      })
      .catch(() => {
        setError(`${provider} sign-in is not available.`);
      });
  };

  return (
    <div className="min-h-screen bg-void text-fg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo variant="primary" className="h-10 mx-auto mb-3" showWordmark />
          <p className="text-sm text-muted">Create your ZERA account.</p>
        </div>

        <div className="card-lift zera-card p-8">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="field-label">Full name</label>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted shrink-0" />
                <input id="name" className="field-input pl-8" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            </div>
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
              <label className="field-label">Confirm password</label>
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
            <button className="btn-primary w-full py-3" disabled={busy || !isFormValid}>
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase text-muted">
              <span className="bg-void px-4">Or continue with</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-muted bg-void text-fg hover:bg-muted-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleOAuth('google')}
              disabled={!import.meta.env.VITE_GOOGLE_CLIENT_ID}
            >
              <span className="text-sm">Continue with Google</span>
              {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                <span className="text-xs text-muted">Google OAuth</span>
              ) : (
                <span className="text-xs text-error">Not configured</span>
              )}
            </button>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-muted bg-void text-fg hover:bg-muted-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleOAuth('github')}
              disabled={!import.meta.env.VITE_GITHUB_CLIENT_ID}
            >
              <span className="text-sm">Continue with GitHub</span>
              {import.meta.env.VITE_GITHUB_CLIENT_ID ? (
                <span className="text-xs text-muted">GitHub OAuth</span>
              ) : (
                <span className="text-xs text-error">Not configured</span>
              )}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account? <Link className="font-medium text-violet-300 hover:underline" to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}