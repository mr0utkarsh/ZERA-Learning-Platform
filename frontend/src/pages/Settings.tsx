import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { Palette, Bell, Lock, LogOut, Globe } from 'lucide-react';

export default function Settings() {
  const { logout } = useAuth();

  const SETTINGS = [
    { label: 'Account', icon: Lock, to: '/profile', desc: 'Name, email and password' },
    { label: 'Appearance', icon: Palette, desc: 'Theme and colour preferences' },
    { label: 'Notifications', icon: Bell, desc: 'Email and push notifications' },
    { label: 'Language', icon: Globe, desc: 'Interface language' },
  ];

  return (
    <div className="min-h-screen bg-void text-fg">
      <div className="container max-w-3xl mx-auto px-6 py-12 md:py-20">
        <nav className="mb-8">
          <Link to="/dashboard" className="btn-ghost mb-2 inline-flex items-center gap-2 text-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/><path d="M19 12H5"/></svg>
            Back to dashboard
          </Link>
        </nav>

        <div className="flex items-center gap-4 mb-12">
          <Logo variant="primary" className="h-10" showWordmark />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-fg">Settings</h1>
        </div>

        <div className="card-lift zera-card p-8">
          <h2 className="text-lg font-bold text-fg mb-8">Preferences</h2>
          <div className="space-y-4">
            {SETTINGS.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <s.icon className="h-5 w-5 text-muted shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-fg">{s.label}</div>
                    <div className="text-xs text-muted">{s.desc}</div>
                  </div>
                </div>
                {s.to ? (
                  <Link to={s.to} className="text-sm text-violet-300 hover:underline">Open</Link>
                ) : (
                  <span className="text-sm text-muted">Coming soon</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5">
          <button className="flex items-center gap-2 text-sm text-error hover:bg-red-500/10 rounded-xl px-3 py-2 transition-colors" onClick={logout}>
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}