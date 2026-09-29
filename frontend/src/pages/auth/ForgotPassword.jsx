/**
 * ForgotPassword.jsx — requests a time-limited reset link. The backend
 * always responds with the same generic message regardless of whether the
 * email exists (see password-reset.service.js), so this page cannot be
 * used to enumerate registered accounts.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [devLink, setDevLink] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const { data } = await api.post('/auth/password-reset/request', { email });
    setMessage(data.message);
    if (data.devResetLink) setDevLink(data.devResetLink); // only ever populated in development mode
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="card w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-brand-600">Reset your password</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Work email</label>
            <input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary w-full">Send reset link</button>
        </form>
        {message && <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-inset ring-slate-200">{message}</p>}
        {devLink && (
          <p className="mt-2 break-all rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
            Dev mode only (no real mail server configured): <a className="underline" href={devLink}>{devLink}</a>
          </p>
        )}
        <p className="mt-4 text-center text-sm"><Link to="/login" className="text-brand-600 hover:underline">Back to sign in</Link></p>
      </div>
    </div>
  );
}
