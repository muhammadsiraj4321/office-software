import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import IncomePage from './pages/IncomePage.jsx';
import ExpensesPage from './pages/ExpensesPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import DocumentsPage from './pages/DocumentsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import UsersAdminPage from './pages/UsersAdminPage.jsx';
import ActivityPage from './pages/ActivityPage.jsx';
import ProjectsSummary from './pages/ProjectsSummary.jsx';
import ProjectDetails from './pages/ProjectDetails.jsx';
import MaterialDeliveryPage from './pages/MaterialDeliveryPage.jsx';
import useAuth from './store/auth.js';
import { canSeeDocuments } from './utils/rbac.js'

function Sidebar() {
  const { user } = useAuth();
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain rounded-sm" />
        <div className="font-semibold">Al Dhab Engraving</div>
      </div>
      <nav>
        {/* 1. Dashboard */}
        <NavLink to="/" end className={({ isActive }) => '' + (isActive ? 'active ' : '')}>🏠 Dashboard</NavLink>
        {/* 2. Income (not for Employees) */}
        {user?.role!=='EMPLOYEE' && (
          <NavLink to="/income" className={({ isActive }) => '' + (isActive ? 'active ' : '')}>💰 Income</NavLink>
        )}
        {/* 3. Expenses */}
        <NavLink to="/expenses" className={({ isActive }) => '' + (isActive ? 'active ' : '')}>💳 Expenses</NavLink>
        {/* 4. Projects (not for Employees) */}
        {user?.role!=='EMPLOYEE' && (
          <NavLink to="/projects" className={({ isActive }) => '' + (isActive ? 'active ' : '')}>📁 Projects</NavLink>
        )}
        {/* 5. Material Delivery (Admin/Accountant) */}
        {(user?.role==='ADMIN' || user?.role==='ACCOUNTANT') && (
          <NavLink to="/material-delivery" className={({ isActive }) => '' + (isActive ? 'active ' : '')}>🚚 Material Delivery</NavLink>
        )}
        {/* 6. Documents (not for Employees) */}
        {canSeeDocuments(user) && (
          <NavLink to="/documents" className={({ isActive }) => '' + (isActive ? 'active ' : '')}>📄 Documents</NavLink>
        )}
        {/* 7. Users (Admin) */}
        {user?.role==='ADMIN' && (
          <NavLink to="/admin/users" className={({ isActive }) => '' + (isActive ? 'active ' : '')}>👤 Users</NavLink>
        )}
        {/* 8. Activity (Admin/GM) */}
        {(user?.role==='ADMIN' || user?.role==='GM') && (
          <NavLink to="/activity" className={({ isActive }) => '' + (isActive ? 'active ' : '')}>📝 Activity</NavLink>
        )}
      </nav>
    </aside>
  );
}

export default function App() {
  const { user, token, logout } = useAuth();
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('theme') || 'dark' } catch { return 'dark' }
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme]);
  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  const authed = !!token;
  if (!authed) {
    return (
      <div className="container py-10">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }
  return (
    <div className="shell">
      {/* Mobile sidebar toggle (CSS-only) */}
      <input id="nav-toggle" type="checkbox" className="nav-toggle" aria-hidden="true" />
      <Sidebar />
      {/* Click overlay to close on mobile/tablet */}
      <label htmlFor="nav-toggle" className="overlay" aria-hidden="true" />
      {/* Close button (shown when menu is open on mobile/tablet) */}
      <label htmlFor="nav-toggle" className="close-btn" aria-hidden="true">✕</label>
      <div className="flex flex-col min-h-screen">
        <div className="topbar">
          <div className="inner">
            <div className="left flex items-center gap-2">
              {/* Hamburger button (visible on mobile/tablet) */}
              <label htmlFor="nav-toggle" className="hamburger-btn" title="Open menu" aria-label="Open menu">
                <span aria-hidden>☰</span>
              </label>
              <div className="text-sm text-slate-500">{user?.name || 'User'}</div>
            </div>
            {/* App name centered on mobile/tablet only (hidden on desktop) */}
            <div className="center app-name-mobile lg:hidden font-semibold">Al Dhab Engraving</div>
            <div className="right flex items-center gap-3">
              <button
                className="btn-outline rounded-full w-9 h-9 p-0 flex items-center justify-center"
                onClick={toggleTheme}
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                <span aria-hidden>
                  {theme === 'light' ? '🌙' : '☀️'}
                </span>
              </button>
              <div className="date text-sm text-slate-500">{new Date().toLocaleDateString()}</div>
              <button className="btn btn-outline" onClick={logout}>Logout</button>
            </div>
          </div>
        </div>
        <main className="container py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            {user?.role!=='EMPLOYEE' && <Route path="/income" element={<IncomePage />} />}
            <Route path="/expenses" element={<ExpensesPage />} />
            {user?.role!=='EMPLOYEE' && <Route path="/projects" element={<ProjectsPage />} />}
            {user?.role!=='EMPLOYEE' && <Route path="/projects/summary" element={<ProjectsSummary />} />}
            {user?.role!=='EMPLOYEE' && <Route path="/projects/:id/details" element={<ProjectDetails />} />}
            {(user?.role==='ADMIN' || user?.role==='ACCOUNTANT') && <Route path="/material-delivery" element={<MaterialDeliveryPage />} />}
            {canSeeDocuments(user) && <Route path="/documents" element={<DocumentsPage />} />}
            {user?.role==='ADMIN' && <Route path="/admin/users" element={<UsersAdminPage />} />}
            {(user?.role==='ADMIN' || user?.role==='GM') && <Route path="/activity" element={<ActivityPage />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
