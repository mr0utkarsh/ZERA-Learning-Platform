import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { MarketingHeader } from './MarketingHeader';

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-void text-fg">
      <MarketingHeader />
      <main className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/5 bg-void/60 py-12">
      <div className="container mx-auto px-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center">
            <Logo showWordmark className="h-9" />
          </Link>
          <p className="text-sm text-muted">Your new era of learning.</p>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            <Link to="/about" className="text-muted hover:text-fg transition-colors">About</Link>
            <Link to="/resources" className="text-muted hover:text-fg transition-colors">Resources</Link>
            <Link to="/support" className="text-muted hover:text-fg transition-colors">Support</Link>
            <Link to="/login" className="text-muted hover:text-fg transition-colors">Log in</Link>
            <Link to="/signup" className="text-muted hover:text-fg transition-colors">Join ZERA</Link>
            <a href="#experience" className="text-muted hover:text-fg transition-colors">Experience</a>
          </nav>
        </div>
        <div className="mt-6 text-center text-xs text-muted">
          &copy; {new Date().getFullYear()} ZERA. All rights reserved.
        </div>
      </div>
    </footer>
  );
}