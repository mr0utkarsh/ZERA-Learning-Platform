import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/syllabus', label: 'Syllabus' },
  { to: '/study-plan', label: 'Study Plan' },
  { to: '/progress', label: 'Progress' },
  { to: '/notes', label: 'Notes' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/doubts', label: 'Doubt Solver' },
  { to: '/handwriting', label: 'Handwriting' },
  { to: '/pyqs', label: 'PYQs' },
  { to: '/interview', label: 'Mock Interview' },
  { to: '/performance', label: 'Performance' },
  { to: '/resources', label: 'Resources' }
];

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-4">
          <NavLink to="/dashboard"><Logo /></NavLink>
          <span className="text-xs text-slate-400">Your New Era of Learning</span>
        </div>
        <nav className="flex flex-wrap gap-1 p-2 md:flex-col">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-600">
            {user ? `Welcome, ${user.name}` : 'Welcome'}
          </div>
          <button className="btn-ghost" onClick={logout}>Log out</button>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
