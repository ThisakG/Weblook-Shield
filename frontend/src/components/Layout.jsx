/**
 * Layout.jsx
 * ----------------------------------------------------------------------------
 * Shared shell (top navbar + side navigation + content area) used by every
 * authenticated page. Navigation items are filtered by role so an employee
 * never even SEES an "Admin" link — reducing cognitive load per the
 * Usability NFR ("role-appropriate views ... reduced cognitive load").
 * ----------------------------------------------------------------------------
 */
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_BY_ROLE = {
  employee: [
    { to: '/', label: 'My Dashboard' },
    { to: '/policies', label: 'Policy Library' },
    { to: '/training', label: 'Security Awareness' },
    { to: '/assets', label: 'My Assets' },
    { to: '/profile', label: 'Profile & Security' },
  ],
  administrator: [
    { to: '/', label: 'My Dashboard' },
    { to: '/policies', label: 'Policy Library' },
    { to: '/training', label: 'Security Awareness' },
    { to: '/assets', label: 'My Assets' },
    { to: '/admin', label: 'Admin Overview' },
    { to: '/admin/users', label: 'User Management' },
    { to: '/admin/policies', label: 'Manage Policies' },
    { to: '/admin/assets', label: 'Asset Inventory' },
    { to: '/admin/audit', label: 'Audit Log' },
    { to: '/profile', label: 'Profile & Security' },
  ],
  system_owner: [
    { to: '/', label: 'Oversight Dashboard' },
    { to: '/policies', label: 'Policy Library' },
    { to: '/admin/audit', label: 'Audit Log (Read-only)' },
    { to: '/profile', label: 'Profile & Security' },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV_BY_ROLE[user?.role] || [];

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top bar: brand red, white text — the primary theme statement */}
      <header className="bg-brand-500 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">Weblook Shield</span>
            <span className="hidden text-xs font-medium text-brand-100 sm:inline">Information Security Policy Awareness &amp; Management</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:inline">{user?.fullName} &middot; <span className="capitalize">{user?.role?.replace('_', ' ')}</span></span>
            <button onClick={handleLogout} className="rounded-md bg-brand-700 px-3 py-1.5 font-semibold hover:bg-brand-800">
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        {/* Side navigation — gray, neutral, so the red stays reserved for
            brand/primary actions rather than being overused everywhere. */}
        <nav className="w-56 shrink-0">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-sm font-medium transition ${
                      isActive ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-white hover:text-slate-900'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
