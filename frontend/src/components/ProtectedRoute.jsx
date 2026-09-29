/**
 * ProtectedRoute.jsx
 * ----------------------------------------------------------------------------
 * Frontend route guard: redirects to /login if no session, and optionally
 * restricts a route to a set of roles. This is a USABILITY feature (don't
 * show an admin screen's skeleton to an employee before a 403 comes back)
 * — the enforced security boundary is always the backend's requireRole
 * middleware, never this component. See NFR "no client-side-only
 * permission checks."
 * ----------------------------------------------------------------------------
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
