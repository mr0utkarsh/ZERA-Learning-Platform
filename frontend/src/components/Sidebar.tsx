import { Link, NavLink } from 'react-router-dom';import {
  Menu,
  X,
  LayoutDashboard,
  BookOpen,
  CalendarRange,
  NotebookPen,
  Dumbbell,
  Sparkles,
  MessageCircleQuestion,
  PenLine,
  FileQuestion,
  Mic,
  BarChart3,
  TrendingUp,
  Library,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

const APP_NAV = [
  {
    label: 'Learn',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/syllabus', label: 'Syllabus', icon: BookOpen },
      { to: '/study-plan', label: 'Study Plan', icon: CalendarRange },
      { to: '/notes', label: 'Notes', icon: NotebookPen },
    ],
  },
  {
    label: 'Practise',
    items: [
      { to: '/quiz', label: 'Quiz', icon: Dumbbell },
      { to: '/ai-tools', label: 'AI Study Support', icon: Sparkles },
      { to: '/doubts', label: 'Doubt Solver', icon: MessageCircleQuestion },
      { to: '/handwriting', label: 'Handwriting', icon: PenLine },
      { to: '/pyqs', label: 'PYQs', icon: FileQuestion },
      { to: '/interview', label: 'Mock Interview', icon: Mic },
    ],
  },
  {
    label: 'Track',
    items: [
      { to: '/progress', label: 'Progress', icon: BarChart3 },
      { to: '/performance', label: 'Performance', icon: TrendingUp },
      { to: '/resources', label: 'Resources', icon: Library },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/profile', label: 'Profile', icon: User },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function AppSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity md:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        aria-label="Main navigation"
        className={`fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-white/5 bg-void/95 backdrop-blur-xl transition-transform duration-300 ease-out md:static md:translate-x-0 md:w-64 md:bg-transparent ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4">
          <Link to="/dashboard" onClick={onClose}>
            <Logo showWordmark className="h-9" />
          </Link>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 ring-1 ring-white/10 text-muted hover:text-fg md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-2 scrollbar-none">
          {APP_NAV.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="px-3 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-gradient-to-r from-violet-500/15 to-cyan-500/10 text-fg ring-1 ring-white/10'
                            : 'text-muted hover:bg-white/5 hover:text-fg'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-cyan-400' : ''}`} />
                          <span className="truncate">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-sm font-bold text-white">
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">{user?.name || 'Student'}</p>
              <p className="truncate text-xs text-muted">Your new era of learning</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-error hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>
    </>
  );
}

/**
 * The button that opens the navigation drawer on small screens. The drawer
 * itself is rendered once, by the shell, so the page only ever holds a single
 * navigation tree.
 */
export function MobileNavButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden grid h-10 w-10 place-items-center rounded-xl bg-surface-2 ring-1 ring-white/10 text-fg"
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
