import React, { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import useAuth from '../store/auth';
import { canSeeDocuments } from '../utils/rbac';

/**
 * MobileDropdownNav
 * - Top-right glass button with 3-line icon (hamburger)
 * - On click, shows a vertical overlay menu with smooth animation
 * - Covers ~60–70% width and ~50–70% height
 * - Works on mobile/tablet only (hidden on desktop)
 * - Keeps React Router links intact; does not navigate when opening the menu
 */
export default function MobileDropdownNav() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  // Close the menu when clicking outside the panel
  useEffect(() => {
    function onDocClick(e) {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // Lock background scroll when menu is open (mobile-friendly)
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div className="relative lg:hidden">
      {/* Trigger button: glass, rounded, 3-line icon */}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open navigation menu"
        onClick={() => setOpen(v => !v)}
        className="inline-grid place-items-center w-10 h-10 rounded-full bg-white/10 dark:bg-slate-900/40 backdrop-blur-xl text-slate-100 shadow-md ring-1 ring-white/10 hover:bg-white/15 transition"
      >
        <span className="block w-5 space-y-1" aria-hidden>
          <span className="block h-0.5 rounded bg-current"></span>
          <span className="block h-0.5 rounded bg-current"></span>
          <span className="block h-0.5 rounded bg-current"></span>
        </span>
      </button>

      {/* Screen overlay to dim background and capture clicks */}
      {open && (
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        />
      )}

      {/* Menu panel (glass effect, animated) */}
      <div
        ref={panelRef}
        role="menu"
        aria-label="Main navigation"
        className={[
          'fixed z-50 right-3 top-14',
          'w-[65vw] max-w-xs',             // ~60–70% width
          'h-[60vh] max-h-[520px]',        // ~50–70% height
          'rounded-2xl p-3',
          'bg-white/15 dark:bg-slate-900/60 backdrop-blur-2xl',
          'ring-1 ring-white/20 shadow-2xl',
          'transition-all duration-200 ease-out origin-top-right',
          open ? 'opacity-100 scale-100 translate-y-0' : 'pointer-events-none opacity-0 scale-95 -translate-y-2'
        ].join(' ')}
      >
        <nav className="flex flex-col gap-1.5 overflow-y-auto h-full">
          {/* Header / user info (optional) */}
          <div className="flex items-center justify-between px-2 py-1">
            <div className="text-sm font-semibold">Menu</div>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-lg grid place-items-center bg-white/10 hover:bg-white/15 ring-1 ring-white/10"
            >
              <span aria-hidden>✕</span>
            </button>
          </div>
          <div className="h-px bg-white/10 my-1" />

          {/* Links: keep routes and permissions aligned with Sidebar */}
          <NavLink to="/" end onClick={() => setOpen(false)} className={linkClass}>🏠 Dashboard</NavLink>
          {user?.role !== 'EMPLOYEE' && (
            <NavLink to="/income" onClick={() => setOpen(false)} className={linkClass}>💰 Income</NavLink>
          )}
          <NavLink to="/expenses" onClick={() => setOpen(false)} className={linkClass}>💳 Expenses</NavLink>
          {user?.role !== 'EMPLOYEE' && (
            <NavLink to="/projects" onClick={() => setOpen(false)} className={linkClass}>📁 Projects</NavLink>
          )}
          {(user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT') && (
            <NavLink to="/material-delivery" onClick={() => setOpen(false)} className={linkClass}>🚚 Material Delivery</NavLink>
          )}
          {canSeeDocuments(user) && (
            <NavLink to="/documents" onClick={() => setOpen(false)} className={linkClass}>📄 Documents</NavLink>
          )}
          {user?.role === 'ADMIN' && (
            <NavLink to="/admin/users" onClick={() => setOpen(false)} className={linkClass}>👤 Users</NavLink>
          )}
          {(user?.role === 'ADMIN' || user?.role === 'GM') && (
            <NavLink to="/activity" onClick={() => setOpen(false)} className={linkClass}>📝 Activity</NavLink>
          )}

          <div className="mt-auto pt-2 border-t border-white/10 flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setOpen(false); logout(); }}
              className="flex-1 btn-outline"
            >Logout</button>
          </div>
        </nav>
      </div>
    </div>
  );
}

// Shared link class for menu items (Tailwind + glass highlights)
function linkClass({ isActive }) {
  const base = 'px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors';
  const normal = 'text-slate-100/90 hover:bg-white/10 hover:text-white ring-1 ring-transparent hover:ring-white/10';
  const active = 'bg-indigo-600/30 text-indigo-200 ring-1 ring-indigo-400/30';
  return [base, isActive ? active : normal].join(' ');
}
