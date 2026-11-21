import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Dashboard', path: '/' },
    { name: 'Report an Issue', path: '/report' },
    { name: 'System Health', path: '/health' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full shrink-0 h-14 bg-canvas/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        {/* Minimal Brand Identity */}
        <Link
          to="/"
          className="flex items-center gap-2 text-ink-primary font-serif text-xl tracking-tight hover:text-accent focus-visible:outline-2 focus-visible:outline-accent rounded px-1 py-0.5"
          aria-label="CivicResolve home page"
        >
          <span className="font-normal">CivicResolve</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm transition-colors py-1 min-h-[44px] flex items-center ${
                  isActive
                    ? 'text-ink-primary font-bold border-b border-ink-primary'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Mobile menu toggle */}
        <div className="md:hidden flex items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-ink-secondary hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-accent min-h-[44px] min-w-[44px] flex items-center justify-center rounded"
            aria-controls="mobile-menu"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown positioned below stable header height */}
      {mobileMenuOpen && (
        <nav
          id="mobile-menu"
          className="md:hidden absolute top-14 left-0 right-0 bg-canvas border-b border-border px-4 py-3 space-y-1 shadow-elevated z-50 animate-fade-in"
          aria-label="Mobile Navigation"
        >
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2.5 text-sm min-h-[44px] flex items-center ${
                  isActive ? 'text-ink-primary font-bold' : 'text-ink-secondary hover:text-ink-primary'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
