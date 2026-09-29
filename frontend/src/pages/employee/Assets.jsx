/**
 * Assets.jsx  (Employee "My Assets")
 * ----------------------------------------------------------------------------
 * "Requesting assets and viewing previously assigned/requested assets"
 * (Proposal Section 8, User Dashboard).
 * ----------------------------------------------------------------------------
 */
import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function Assets() {
  const [myAssets, setMyAssets] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [form, setForm] = useState({ assetType: '', justification: '' });
  const [submitting, setSubmitting] = useState(false);

  function load() {
    api.get('/assets/mine').then((r) => setMyAssets(r.data.assets));
    api.get('/assets/requests/mine').then((r) => setMyRequests(r.data.requests));
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/assets/requests', form);
      setForm({ assetType: '', justification: '' });
      load();
    } finally {
      setSubmitting(false);
    }
  }

  const statusBadge = { pending: 'badge-warning', approved: 'badge-neutral', rejected: 'badge-danger', fulfilled: 'badge-success' };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Assets</h1>

      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Assigned to me</h2>
        {myAssets.length ? (
          <ul className="divide-y divide-slate-100 text-sm">
            {myAssets.map((a) => (
              <li key={a.id} className="flex justify-between py-2">
                <span>{a.asset_tag} — {a.asset_type}</span>
                <span className="text-slate-500">{a.description}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-500">No assets currently assigned to you.</p>}
      </div>

      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Request an asset</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input required placeholder="Asset type (e.g. Laptop)" className="input-field" value={form.assetType}
                 onChange={(e) => setForm((f) => ({ ...f, assetType: e.target.value }))} />
          <input placeholder="Justification (optional)" className="input-field sm:col-span-1"
                 value={form.justification} onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))} />
          <button type="submit" disabled={submitting} className="btn-primary">Submit request</button>
        </form>
      </div>

      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">My requests</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {myRequests.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2">
              <span>{r.asset_type} — requested {new Date(r.requested_at).toLocaleDateString()}</span>
              <span className={statusBadge[r.status]}>{r.status}</span>
            </li>
          ))}
          {!myRequests.length && <p className="text-sm text-slate-500">No requests yet.</p>}
        </ul>
      </div>
    </div>
  );
}
