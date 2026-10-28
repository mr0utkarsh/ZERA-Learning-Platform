import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/ui';
import { Brand } from './PublicLayout';

const NAV = [
  { section: 'Learn' },
  { to: '/dashboard', ico: '🏠', label: 'Dashboard' },
  { to: '/courses', ico: '📚', label: 'My Courses' },
  { to: '/progress', ico: '📈', label: 'Progress' },
  { section: 'Practice' },
  { to: '/quiz', ico: '❓', label: 'Quizzes' },
  { to: '/tests', ico: '📝', label: 'Mock Tests' },
  { to: '/pyqs', ico: '🗂️', label: 'PYQs' },
  { section: 'AI Tools' },
  { to: '/notes', ico: '✍️', label: 'Notes' },
  { to: '/doubts', ico: '💬', label: 'Doubt Solver' },
  { to: '/interview', ico: '🎤', label: 'Mock Interview' },
  { section: 'Plan' },
  { to: '/study-plan', ico: '🗓️', label: 'Study Plan' },
  { to: '/performance', ico: '📊', label: 'Performance' },
];

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = async () => {
    await logout();
    navigate('/');
  };

  const nav = (
    <>
      <div className="brand" style={{ padding: '4px 10px 18px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'inherit', fontWeight: 800, fontSize: 19 }}>
          <span className="mark">Z</span> ZERA
        </Link>
      </div>
      {NAV.map((item, i) => item.section ? (
        <div className="side-section" key={i}>{item.section}</div>
      ) : (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}
          onClick={() => setOpen(false)}
        >
          <span className="ico" aria-hidden="true">{item.ico}</span>
          {item.label}
        </NavLink>
      ))}
      <div className="spacer" />
      <NavLink to="/profile" className={({ isActive }) => `side-link${isActive ? ' active' : ''}`} onClick={() => setOpen(false)}>
        <span className="ico" aria-hidden="true">👤</span> Profile
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `side-link${isActive ? ' active' : ''}`} onClick={() => setOpen(false)}>
        <span className="ico" aria-hidden="true">⚙️</span> Settings
      </NavLink>
      <button className="side-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }} onClick={doLogout}>
        <span className="ico" aria-hidden="true">🚪</span> Log out
      </button>
      <div className="side-user">
        <Avatar name={user?.name} color={user?.avatarColor} />
        <div className="meta">
          <b>{user?.name}</b>
          <span>{user?.email}</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Sidebar">{nav}</aside>
      <div className="app-main">
        <div className="topbar">
          <Brand small />
          <button className="btn btn-outline btn-sm" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? '✕ Close' : '☰ Menu'}
          </button>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
