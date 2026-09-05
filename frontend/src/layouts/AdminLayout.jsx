import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/ui';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const doLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Admin sidebar">
        <div style={{ padding: '4px 10px 18px', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 19 }}>
          <span className="mark" style={{ background: '#111827' }}>Z</span>
          <span>ZERA <span className="badge badge-gray">Admin</span></span>
        </div>
        <NavLink to="/admin" end className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}>
          <span className="ico">📊</span> Dashboard
        </NavLink>
        <NavLink to="/admin/students" className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}>
          <span className="ico">🧑‍🎓</span> Students
        </NavLink>
        <NavLink to="/admin/analytics" className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}>
          <span className="ico">📈</span> Analytics
        </NavLink>
        {user?.role === 'SUPER_ADMIN' && (
          <>
            <NavLink to="/admin/admins" className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}>
              <span className="ico">🛡️</span> Admin team
            </NavLink>
            <NavLink to="/admin/settings" className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}>
              <span className="ico">⚙️</span> Settings
            </NavLink>
          </>
        )}
        <div className="spacer" />
        <button className="side-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }} onClick={doLogout}>
          <span className="ico">🚪</span> Log out
        </button>
        <div className="side-user">
          <Avatar name={user?.name} color="#111827" />
          <div className="meta">
            <b>{user?.name}</b>
            <span>{user?.role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Administrator'}</span>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <Outlet />
      </div>
    </div>
  );
}
