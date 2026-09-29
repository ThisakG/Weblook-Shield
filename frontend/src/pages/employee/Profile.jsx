/**
 * Profile.jsx  (shared "Profile & Security" page, all roles)
 * ----------------------------------------------------------------------------
 * "Account creation (via admin-provisioned invite), profile management, and
 * self-service password reset" plus MFA enrolment (Proposal Section 8).
 * The QR code shown here is generated server-side (backend/src/utils/totp.js)
 * and only ever contains the otpauth:// URL — the raw base32 secret itself
 * is never displayed in this UI, reducing shoulder-surfing risk.
 * ----------------------------------------------------------------------------
 */
import React, { useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [qrCode, setQrCode] = useState(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  async function startMfaSetup() {
    const { data } = await api.post('/auth/mfa/setup');
    setQrCode(data.qrCodeDataUrl);
    setMessage('');
  }

  async function confirmMfaSetup(e) {
    e.preventDefault();
    try {
      await api.post('/auth/mfa/confirm', { code });
      setMessage('MFA enabled successfully.');
      setQrCode(null);
      setUser((u) => ({ ...u, mfaEnabled: true }));
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not confirm code.');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Profile &amp; Security</h1>

      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Account details</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Full name</dt><dd className="font-medium">{user?.fullName}</dd></div>
          <div><dt className="text-slate-500">Email</dt><dd className="font-medium">{user?.email}</dd></div>
          <div><dt className="text-slate-500">Department</dt><dd className="font-medium">{user?.department || '—'}</dd></div>
          <div><dt className="text-slate-500">Role</dt><dd className="font-medium capitalize">{user?.role?.replace('_', ' ')}</dd></div>
        </dl>
      </div>

      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Multi-Factor Authentication (MFA)</h2>
        {user?.mfaEnabled ? (
          <p className="badge-success">MFA is enabled on your account.</p>
        ) : qrCode ? (
          <form onSubmit={confirmMfaSetup} className="space-y-3">
            <p className="text-sm text-slate-600">Scan this QR code with an authenticator app (e.g. Google Authenticator), then enter the 6-digit code it shows.</p>
            <img src={qrCode} alt="MFA enrolment QR code" className="h-40 w-40" />
            <input
              className="input-field max-w-[10rem] text-center tracking-widest" maxLength={6} inputMode="numeric"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000"
            />
            <button type="submit" className="btn-primary">Confirm &amp; enable MFA</button>
          </form>
        ) : (
          <div>
            <p className="mb-3 text-sm text-slate-600">
              WSP-04 requires MFA for Administrator and System Owner roles, and strongly recommends it for everyone.
            </p>
            <button className="btn-primary" onClick={startMfaSetup}>Set up MFA</button>
          </div>
        )}
        {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
      </div>

      <div className="card">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Password</h2>
        <p className="text-sm text-slate-600">
          Use the <a href="/forgot-password" className="text-brand-600 hover:underline">Forgot password</a> flow to change your password securely at any time.
        </p>
      </div>
    </div>
  );
}
