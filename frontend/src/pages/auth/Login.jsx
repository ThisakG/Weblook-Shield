/**
 * Login.jsx
 * ----------------------------------------------------------------------------
 * Two-step login form: password step, then (only if the account has MFA
 * enabled) a TOTP code step. The backend tells us via a 206 response
 * whether a code is needed — the frontend never decides this on its own,
 * so it cannot be tricked into skipping MFA for an MFA-enabled account.
 * ----------------------------------------------------------------------------
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [needsMfa, setNeedsMfa] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await login(email, password, needsMfa ? mfaCode : undefined);
      if (result.mfaRequired) {
        setNeedsMfa(true);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="card w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-brand-600">Weblook Shield</h1>
          <p className="mt-1 text-sm text-slate-500">Information Security Policy Awareness &amp; Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!needsMfa && (
            <>
              <div>
                <label className="label" htmlFor="email">Work email</label>
                <input id="email" type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="password">Password</label>
                <input id="password" type="password" required className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </>
          )}

          {needsMfa && (
            <div>
              <label className="label" htmlFor="mfaCode">Authenticator code</label>
              <input
                id="mfaCode" type="text" inputMode="numeric" maxLength={6} required
                className="input-field tracking-widest text-center text-lg" value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))} autoFocus
              />
              <p className="mt-1 text-xs text-slate-500">Enter the 6-digit code from your authenticator app.</p>
            </div>
          )}

          {error && <p className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700 ring-1 ring-inset ring-brand-200">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Please wait…' : needsMfa ? 'Verify & Sign in' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 flex justify-between text-sm">
          <Link to="/forgot-password" className="text-brand-600 hover:underline">Forgot password?</Link>
          <Link to="/register" className="text-brand-600 hover:underline">Create account</Link>
        </div>
      </div>
    </div>
  );
}
