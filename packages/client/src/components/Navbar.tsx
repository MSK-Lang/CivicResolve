import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchHealth } from '../lib/api';
import type { HealthCheckResponse } from '@civicresolve/shared';
import { ShieldCheck, Menu, X, Activity } from 'lucide-react';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const location = useLocation();

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const navLinks = [
    { name: 'Dashboard', path: '/' },
    { name: 'Report Issue', path: '/report' },
    { name: 'System Health', path: '/health' },
  ];

  return (
    <header className="bg-civic-950 text-white border-b border-civic-900 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <Link
            to="/"
            className="flex items-center gap-3 text-white font-bold text-lg tracking-tight hover:opacity-95 focus-visible:outline-2 focus-visible:outline-civic-400 rounded-md p-1"
            aria-label="CivicResolve home page"
          >
            <div className="w-8 h-8 rounded bg-civic-800 flex items-center justify-center text-white border border-civic-700 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-civic-200" aria-hidden="true" />
            </div>
            <span className="font-serif tracking-normal text-xl">CivicResolve</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] flex items-center ${
                    isActive
                      ? 'bg-civic-900 text-civic-200 font-semibold border border-civic-800'
                      : 'text-slate-200 hover:text-white hover:bg-civic-900/60'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.name}
                </Link>
              );
            })}

            {/* Quick status pill */}
            <div className="ml-4 pl-4 border-l border-civic-800 flex items-center gap-2 text-xs text-slate-300 font-mono">
              <Activity className="w-4 h-4 text-civic-400" aria-hidden="true" />
              <span>API: {health ? health.status : 'connecting...'}</span>
            </div>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-civic-900 focus-visible:outline-2 focus-visible:outline-civic-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-controls="mobile-menu"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <nav
          id="mobile-menu"
          className="md:hidden bg-civic-950 border-b border-civic-900 px-4 pt-2 pb-4 space-y-1"
          aria-label="Mobile Navigation"
        >
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium min-h-[44px] flex items-center ${
                  isActive
                    ? 'bg-civic-900 text-civic-200 font-semibold'
                    : 'text-slate-200 hover:text-white hover:bg-civic-900/60'
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
