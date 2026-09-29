/**
 * ResetPassword.jsx — completes the reset using the token from the emailed
 * (or, in dev mode, displayed) link's query string.
 */
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/password-reset/complete', { token, newPassword });
      setDone(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset password.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="card w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-brand-600">Choose a new password</h1>
        {done ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200">
            Password updated. Redirecting to sign in…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">New password</label>
              <input type="password" required className="input-field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <p className="mt-1 text-xs text-slate-500">At least 14 characters, including a letter and a number or symbol.</p>
            </div>
            {error && <p className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700 ring-1 ring-inset ring-brand-200">{error}</p>}
            <button type="submit" className="btn-primary w-full">Update password</button>
          </form>
        )}
        <p className="mt-4 text-center text-sm"><Link to="/login" className="text-brand-600 hover:underline">Back to sign in</Link></p>
      </div>
    </div>
  );
}
