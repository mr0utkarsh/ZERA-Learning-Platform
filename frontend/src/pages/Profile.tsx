import { useState } from 'react';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Calendar, ShieldCheck, LogOut } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');

  return (
    <div className="min-h-screen bg-void text-fg">
      <div className="container max-w-3xl mx-auto px-6 py-12 md:py-20">
        <nav className="mb-8">
          <Logo variant="primary" className="h-9" showWordmark />
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-fg mb-12">Profile</h1>

        <div className="card-lift zera-card p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 text-sm font-bold text-white">
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-fg">{user?.name || 'Student'}</h2>
              <p className="text-sm text-muted">{user?.email || ''}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted" />
                <span className="text-sm text-fg">Full name</span>
              </div>
              {editing ? (
                <input className="field-input w-64" value={name} onChange={(e) => setName(e.target.value)} />
              ) : (
                <span className="text-sm text-muted">{name}</span>
              )}
            </div>
            <div className="flex items-center justify-between py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted" />
                <span className="text-sm text-fg">Email</span>
              </div>
              <span className="text-sm text-muted">{user?.email || ''}</span>
            </div>
            <div className="flex items-center justify-between py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted" />
                <span className="text-sm text-fg">Member since</span>
              </div>
              <span className="text-sm text-muted">October 2026</span>
            </div>
            <div className="flex items-center justify-between py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-muted" />
                <span className="text-sm text-fg">Account status</span>
              </div>
              <span className="text-sm text-success">Active</span>
            </div>
          </div>

          {editing && (
            <div className="mt-6 flex gap-3">
              <button className="btn-secondary px-6" onClick={() => { setName(user?.name || ''); setEditing(false); }}>Cancel</button>
              <button className="btn-primary px-6" onClick={() => setEditing(false)}>Save changes</button>
            </div>
          )}

          <div className="mt-10 pt-8 border-t border-white/5">
            <button className="flex items-center gap-2 text-sm text-error hover:bg-red-500/10 rounded-xl px-3 py-2 transition-colors" onClick={logout}>
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>

        <div className="mt-12 flex gap-3">
          <button className={`btn ${editing ? 'btn-secondary' : 'btn-ghost'} flex-1`} onClick={() => setEditing(!editing)}>
            {editing ? 'Cancel editing' : 'Edit profile'}
          </button>
        </div>
      </div>
    </div>
  );
}