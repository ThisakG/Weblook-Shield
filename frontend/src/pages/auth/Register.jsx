/**
 * Register.jsx
 * ----------------------------------------------------------------------------
 * Public self-registration always creates an 'employee' account (see
 * backend/src/modules/auth/auth.service.js registerEmployee). Administrator
 * and System Owner accounts are never created here — they're provisioned
 * deliberately by an existing administrator through User Management.
 * ----------------------------------------------------------------------------
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', department: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/register', form);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="card w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-brand-600">Create your account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input required className="input-field" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />
          </div>
          <div>
            <label className="label">Work email</label>
            <input type="email" required className="input-field" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </div>
          <div>
            <label className="label">Department</label>
            <input className="input-field" value={form.department} onChange={(e) => update('department', e.target.value)} />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" required className="input-field" value={form.password} onChange={(e) => update('password', e.target.value)} />
            <p className="mt-1 text-xs text-slate-500">At least 14 characters, including a letter and a number or symbol (WSP-04).</p>
          </div>
          {error && <p className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700 ring-1 ring-inset ring-brand-200">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full">{submitting ? 'Creating…' : 'Create account'}</button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account? <Link to="/login" className="text-brand-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
