import { Bell, Search, ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function TopBar({ title }: { title?: string }) {
  const { user } = useAuth();
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-white/5 bg-void/60 px-4 md:px-6 backdrop-blur-xl">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="truncate text-base font-semibold text-fg md:text-lg">{title || 'ZERA'}</h1>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative hidden sm:flex items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted" />
          <input
            className="field-input w-44 md:w-64 pl-9"
            placeholder="Search topics, quizzes…"
            aria-label="Search"
          />
        </div>
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-10 w-10 place-items-center rounded-xl bg-surface-2 ring-1 ring-white/10 text-muted hover:text-fg transition"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-cyan-400 ring-2 ring-void" />
        </button>
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-sm font-bold text-white">
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <ChevronDown className="hidden h-4 w-4 text-muted md:block" />
        </div>
      </div>
    </header>
  );
}

export function ProfileMenu() {
  const { user, logout } = useAuth();
  return (
    <div className="absolute right-2 top-full mt-2 w-56 rounded-2xl bg-surface-1 p-2 shadow-2xl ring-1 ring-white/10 animate-fade-in">
      <div className="px-3 py-2">
        <p className="truncate text-sm font-semibold text-fg">{user?.name || 'Student'}</p>
        <p className="truncate text-xs text-muted">{user?.email || ''}</p>
      </div>
      <div className="my-1 h-px bg-white/5" />
      <a href="/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg hover:bg-white/5">
        <User className="h-4 w-4" /> Profile
      </a>
      <a href="/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg hover:bg-white/5">
        <Settings className="h-4 w-4" /> Settings
      </a>
      <div className="my-1 h-px bg-white/5" />
      <button
        onClick={logout}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-error hover:bg-white/5"
      >
        <LogOut className="h-4 w-4" /> Log out
      </button>
    </div>
  );
}