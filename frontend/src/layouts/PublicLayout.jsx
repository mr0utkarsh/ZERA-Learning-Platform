import React, { useState } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const home = user ? (user.role === 'ADMIN' ? '/admin' : '/dashboard') : '/';

  return (
    <div>
      <header className="navbar">
        <div className="navbar-inner">
          <Brand />
          <nav className="nav-links" aria-label="Main navigation">
            <NavLink to="/features">Features</NavLink>
            <NavLink to="/resources">Resources</NavLink>
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
          <button className="mobile-nav-toggle" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen}>
            <span>{menuOpen ? '×' : '☰'}</span>
          </button>
          {menuOpen && <nav className="mobile-nav-menu" aria-label="Mobile navigation">
            <Link to="/features" onClick={() => setMenuOpen(false)}>Features</Link>
            <Link to="/resources" onClick={() => setMenuOpen(false)}>Skills &amp; Resources</Link>
            <Link to="/about" onClick={() => setMenuOpen(false)}>About</Link>
            <Link to="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>
            {user ? <Link className="btn btn-primary" to={home} onClick={() => setMenuOpen(false)}>Open dashboard</Link> : <div className="mobile-nav-auth"><Link to="/login" onClick={() => setMenuOpen(false)}>Log in</Link><Link className="btn btn-primary" to="/signup" onClick={() => setMenuOpen(false)}>Start learning</Link></div>}
          </nav>}
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
            <Link to="/resources">Resources</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/login">Log in</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
