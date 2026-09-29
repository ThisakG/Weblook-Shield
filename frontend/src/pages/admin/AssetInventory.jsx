/**
 * AssetInventory.jsx
 * ----------------------------------------------------------------------------
 * Admin Dashboard "asset-inventory management", plus the resolution side of
 * the asset-request workflow: "an admin acknowledges and fulfils the
 * request from the same workflow" (Proposal Section 8).
 * ----------------------------------------------------------------------------
 */
import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function AssetInventory() {
  const [inventory, setInventory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [newAsset, setNewAsset] = useState({ assetTag: '', assetType: '', description: '' });

  function load() {
    api.get('/assets/inventory').then((r) => setInventory(r.data.assets));
    api.get('/assets/requests').then((r) => setRequests(r.data.requests));
  }
  useEffect(load, []);

  async function handleAddAsset(e) {
    e.preventDefault();
    await api.post('/assets/inventory', newAsset);
    setNewAsset({ assetTag: '', assetType: '', description: '' });
    load();
  }

  async function resolve(requestId, status) {
    let assetId;
    if (status === 'fulfilled') {
      const available = inventory.find((a) => a.status === 'available');
      assetId = available?.id;
      if (!assetId) {
        alert('No available asset of any type in the inventory to assign. Add one first.');
        return;
      }
    }
    await api.patch(`/assets/requests/${requestId}`, { status, assetId });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Asset Inventory</h1>

      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Pending &amp; recent requests</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500"><tr><th className="py-2">Employee</th><th className="py-2">Type</th><th className="py-2">Status</th><th className="py-2">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="py-2">{r.full_name}</td>
                <td className="py-2">{r.asset_type}</td>
                <td className="py-2 capitalize">{r.status}</td>
                <td className="py-2 space-x-2">
                  {r.status === 'pending' && (
                    <>
                      <button className="text-xs text-brand-600 hover:underline" onClick={() => resolve(r.id, 'fulfilled')}>Fulfil</button>
                      <button className="text-xs text-brand-700 hover:underline" onClick={() => resolve(r.id, 'rejected')}>Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Add asset to inventory</h2>
        <form onSubmit={handleAddAsset} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input required placeholder="Asset tag (e.g. LAPTOP-0010)" className="input-field" value={newAsset.assetTag} onChange={(e) => setNewAsset((a) => ({ ...a, assetTag: e.target.value }))} />
          <input required placeholder="Type" className="input-field" value={newAsset.assetType} onChange={(e) => setNewAsset((a) => ({ ...a, assetType: e.target.value }))} />
          <input placeholder="Description" className="input-field" value={newAsset.description} onChange={(e) => setNewAsset((a) => ({ ...a, description: e.target.value }))} />
          <button type="submit" className="btn-primary">Add</button>
        </form>
      </div>

      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Full inventory</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500"><tr><th className="py-2">Tag</th><th className="py-2">Type</th><th className="py-2">Assigned to</th><th className="py-2">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {inventory.map((a) => (
              <tr key={a.id}>
                <td className="py-2 font-mono text-xs">{a.asset_tag}</td>
                <td className="py-2">{a.asset_type}</td>
                <td className="py-2">{a.assigned_to_name || '—'}</td>
                <td className="py-2 capitalize">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
