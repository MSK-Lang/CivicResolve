import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  Menu,
  X,
  PlusCircle,
  FileText,
  Building2,
} from 'lucide-react';
import { Button } from './Button';

// Citizen Header: Institutional navigation with brand identity and tracking search
export interface CitizenHeaderProps {
  onSearchTrackId?: (trackId: string) => void;
}

export function CitizenHeader({ onSearchTrackId }: CitizenHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchId, setSearchId] = useState('');
  const location = useLocation();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim() && onSearchTrackId) {
      onSearchTrackId(searchId.trim());
    }
  };

  const navLinks = [
    { name: 'Public Feed', path: '/' },
    { name: 'Report Issue', path: '/report' },
    { name: 'System Health', path: '/health' },
  ];

  return (
    <header className="bg-civic-950 text-white border-b border-civic-900 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Civic Seal */}
          <Link
            to="/"
            className="flex items-center gap-3 text-white font-bold text-lg tracking-tight rounded-md p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-civic-400"
            aria-label="CivicResolve home page"
          >
            <div className="w-8 h-8 rounded bg-civic-800 flex items-center justify-center text-white border border-civic-700">
              <ShieldCheck className="w-5 h-5 text-civic-200" aria-hidden="true" />
            </div>
            <span className="font-serif tracking-normal text-xl">CivicResolve</span>
          </Link>

          {/* Quick Tracking Search in Desktop Header */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center max-w-xs w-full relative"
            role="search"
            aria-label="Track report by reference ID"
          >
            <input
              type="text"
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
              placeholder="Track Report ID..."
              aria-label="Report reference identifier"
              className="w-full bg-civic-900 border border-civic-800 rounded-md py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-civic-400 focus-visible:outline-2 focus-visible:outline-civic-400 min-h-[38px]"
            />
            <Search className="w-4 h-4 text-civic-400 absolute left-2.5 top-2.5 pointer-events-none" aria-hidden="true" />
          </form>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            {navLinks.map(link => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] flex items-center ${
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

          {/* Mobile menu toggle button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-civic-900 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-civic-400"
              aria-controls="mobile-citizen-menu"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <nav
          id="mobile-citizen-menu"
          className="md:hidden bg-civic-950 border-b border-civic-900 px-4 pt-2 pb-4 space-y-2"
          aria-label="Mobile Navigation"
        >
          {navLinks.map(link => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-md text-base font-medium min-h-[44px] flex items-center ${
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

// Citizen Mobile Sticky Bottom Action Bar
export interface CitizenMobileNavProps {
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  reportHref?: string;
}

export function CitizenMobileNav({
  primaryActionLabel = 'Report Issue',
  onPrimaryAction,
  reportHref = '/report',
}: CitizenMobileNavProps) {
  return (
    <aside
      aria-label="Citizen quick actions"
      className="fixed bottom-0 left-0 right-0 md:hidden bg-paper-card border-t border-border-subtle p-3 shadow-elevated z-40"
    >
      <div className="flex items-center gap-3 max-w-xl mx-auto">
        {onPrimaryAction ? (
          <Button
            type="button"
            variant="action"
            size="lg"
            className="w-full"
            onClick={onPrimaryAction}
          >
            <PlusCircle className="w-5 h-5" aria-hidden="true" />
            <span>{primaryActionLabel}</span>
          </Button>
        ) : (
          <Link
            to={reportHref}
            className="w-full inline-flex items-center justify-center gap-2 font-semibold text-base rounded-md px-6 py-3 min-h-[48px] bg-terracotta-700 text-white hover:bg-terracotta-600 active:bg-terracotta-800 transition-colors shadow-tactile focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-civic-800"
          >
            <PlusCircle className="w-5 h-5" aria-hidden="true" />
            <span>{primaryActionLabel}</span>
          </Link>
        )}
      </div>
    </aside>
  );
}

// Municipal Admin Header: Operations hub navigation
export interface AdminHeaderProps {
  departmentName?: string;
  userName?: string;
  onSearchOpen?: () => void;
}

export function AdminHeader({
  departmentName = 'Municipal Control Room',
  userName = 'City Officer',
  onSearchOpen,
}: AdminHeaderProps) {
  return (
    <header className="bg-civic-950 text-white border-b border-civic-900 sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2.5 text-white font-bold text-lg"
              aria-label="CivicResolve Operations"
            >
              <div className="w-7 h-7 rounded bg-civic-800 flex items-center justify-center text-white border border-civic-700">
                <Building2 className="w-4 h-4 text-civic-200" aria-hidden="true" />
              </div>
              <span className="font-serif tracking-tight">CivicResolve Operations</span>
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-0.5 text-xs font-mono rounded bg-civic-900 text-civic-300 border border-civic-800">
              {departmentName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {onSearchOpen && (
              <button
                type="button"
                onClick={onSearchOpen}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-civic-900 text-xs text-slate-300 border border-civic-800 hover:text-white min-h-[38px] focus-visible:outline-2 focus-visible:outline-civic-400"
                aria-label="Global search shortcut"
              >
                <Search className="w-3.5 h-3.5 text-civic-400" aria-hidden="true" />
                <span>Search issues (Cmd+K)</span>
              </button>
            )}
            <div className="text-right">
              <span className="block text-xs font-semibold text-white">{userName}</span>
              <span className="block text-[11px] text-civic-400 font-mono">Operations Lead</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

// Municipal Admin Sidebar Rail Navigation
export interface AdminSidebarItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}

export interface AdminSidebarProps {
  items: AdminSidebarItem[];
  className?: string;
}

export function AdminSidebar({ items, className = '' }: AdminSidebarProps) {
  return (
    <nav
      aria-label="Admin Triage Queue Navigation"
      className={`w-64 bg-paper-card border-r border-border-subtle p-4 space-y-1 ${className}`}
    >
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        Triage Queues
      </div>
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={item.onClick}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium min-h-[44px] transition-colors focus-visible:outline-2 focus-visible:outline-civic-800 ${
            item.active
              ? 'bg-civic-50 text-civic-900 border border-civic-200 font-semibold'
              : 'text-ink-secondary hover:text-ink-primary hover:bg-paper-subtle'
          }`}
          aria-current={item.active ? 'page' : undefined}
        >
          <div className="flex items-center gap-2.5">
            {item.icon || <FileText className="w-4 h-4 text-ink-muted" aria-hidden="true" />}
            <span>{item.label}</span>
          </div>
          {typeof item.count === 'number' && (
            <span
              className={`px-2 py-0.5 text-xs font-mono rounded-md ${
                item.active
                  ? 'bg-civic-200 text-civic-950 font-bold'
                  : 'bg-paper-subtle text-ink-secondary border border-border-subtle'
              }`}
            >
              {item.count}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
