/**
 * AuthContext.jsx
 * ----------------------------------------------------------------------------
 * Shared authentication state for the whole app: current user, role, and
 * login/logout/refresh actions. Every page reads the current role from
 * here to decide what to render — but this is a UX convenience ONLY. The
 * real access-control boundary is server-side (backend/src/middleware/rbac.js);
 * hiding a button here never substitutes for that server-side check.
 * ----------------------------------------------------------------------------
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setAccessToken, setCsrfToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, attempt a silent refresh using the HttpOnly cookie so a
  // returning user with a still-valid refresh token doesn't have to log in
  // again just because they closed the tab (access tokens are short-lived
  // and never persisted across reloads).
  //
  // The refresh endpoint also re-issues a CSRF token in its JSON body (not
  // just the cookie — see backend/src/modules/auth/auth.controller.js),
  // because the in-memory csrfToken variable in api/client.js is lost on
  // every full page reload, exactly like the access token is. Without this
  // setCsrfToken call here, a user who is still validly logged in after a
  // refresh would nonetheless fail every subsequent POST/PUT/PATCH/DELETE
  // with a 403 CSRF error, because the header the interceptor attaches
  // would be built from a null in-memory token.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.accessToken);
        setCsrfToken(data.csrfToken);
        const me = await api.get('/auth/me');
        setUser(me.data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email, password, mfaCode) => {
    const { data, status } = await api.post('/auth/login', { email, password, mfaCode });
    if (status === 206) return { mfaRequired: true }; // caller must prompt for MFA code and retry
    setAccessToken(data.accessToken);
    // Same reasoning as the refresh effect above: the CSRF token returned
    // by /auth/login must be stored in memory here, or every mutating
    // request made during this session (acknowledge, quiz submit, asset
    // request, etc.) will be rejected with 403 by backend/src/middleware/csrf.js,
    // since the X-CSRF-Token header would always be built from null.
    setCsrfToken(data.csrfToken);
    setUser(data.user);
    return { mfaRequired: false };
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore — we clear local state regardless */ }
    setAccessToken(null);
    setCsrfToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}