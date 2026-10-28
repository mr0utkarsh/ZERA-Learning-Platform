import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Brand({ small }) {
  return (
    <Link to="/" className="brand" aria-label="ZERA home">
      <span className="mark">Z</span>
      {!small && <span>ZERA</span>}
    </Link>
  );
}

export default function PublicLayout() {
  const { user } = useAuth();
  const home = user ? (user.role === 'ADMIN' ? '/admin' : '/dashboard') : '/';

  return (
    <div>
      <header className="navbar">
        <div className="navbar-inner">
          <Brand />
          <nav className="nav-links" aria-label="Main navigation">
            <NavLink to="/features">Features</NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/contact">Contact</NavLink>
            {user ? (
              <Link className="btn btn-primary btn-sm" to={home}>Open dashboard</Link>
            ) : (
              <>
                <Link to="/login">Log in</Link>
                <Link className="btn btn-primary btn-sm" to="/signup">Start Learning</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="footer-inner">
          <div>
            <Brand small />
            <div style={{ marginTop: 8 }}>ZERA — Your New Era of Learning</div>
          </div>
          <nav aria-label="Footer">
            <Link to="/about">About</Link>
            <Link to="/features">Features</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/login">Log in</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
