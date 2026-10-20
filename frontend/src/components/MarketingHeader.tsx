import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from './Logo';

const MARKETING_NAV: Array<{ label: string; to: string }> = [
  { to: '/#experience', label: 'Experience' },
  { to: '/#journey', label: 'Journey' },
  { to: '/#tools', label: 'Tools' },
  { to: '/resources', label: 'Resources' },
  { to: '/about', label: 'About' },
  { to: '/support', label: 'Support' },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <header className="zera-header sticky top-0 z-50 backdrop-blur-xl bg-void/70 border-b border-white/5">
      <div className="container mx-auto flex items-center justify-between px-5 py-3.5">
        <Link to="/" aria-label="ZERA home" className="flex items-center">
          <Logo showWordmark className="h-9" />
        </Link>

        <nav className="hidden md:flex items-center gap-7" aria-label="Primary">
          {MARKETING_NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                "text-sm font-medium transition-colors " + (isActive ? "text-fg" : "text-muted hover:text-fg")}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-muted hover:text-fg transition-colors">
            Log in
          </Link>
          <Link
            to="/signup"
            className="btn-primary px-5 py-2.5 text-sm"
          >
            Join ZERA
          </Link>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="md:hidden grid h-10 w-10 place-items-center rounded-xl bg-surface-2 ring-1 ring-white/10 text-fg"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      </header>

      <div
        className={`md:hidden fixed inset-0 z-40 bg-void/95 backdrop-blur-xl transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden="true"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <Link to="/" onClick={() => setOpen(false)}>
            <Logo showWordmark className="h-9" />
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 ring-1 ring-white/10 text-fg"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="px-4 py-4 space-y-1">
          {MARKETING_NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-3 text-base font-medium text-fg hover:bg-white/5"
            >
              {n.label}
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-2">
            <Link to="/login" onClick={() => setOpen(false)} className="btn-ghost w-full justify-center">
              Log in
            </Link>
            <Link to="/signup" onClick={() => setOpen(false)} className="btn-primary w-full justify-center">
              Join ZERA
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}