/**
 * PolicyManagement.jsx
 * ----------------------------------------------------------------------------
 * Admin Dashboard "policy publishing and versioning" (Proposal Section 8):
 * create a brand-new policy (first version), or publish a new version of an
 * existing one. The "current version" indicator and the acknowledgement
 * reset that comes from publishing a new version are both handled entirely
 * server-side (see backend/src/modules/policies/policies.service.js).
 * ----------------------------------------------------------------------------
 */
import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function PolicyManagement() {
  const [policies, setPolicies] = useState([]);
  const [newPolicy, setNewPolicy] = useState({ code: '', title: '', category: '', owner: '', isDevicePolicy: false, content: '' });
  const [versionDrafts, setVersionDrafts] = useState({}); // { policyId: { versionLabel, content } }

  function load() { api.get('/policies').then((r) => setPolicies(r.data.policies)); }
  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    await api.post('/policies', newPolicy);
    setNewPolicy({ code: '', title: '', category: '', owner: '', isDevicePolicy: false, content: '' });
    load();
  }

  async function handlePublishVersion(policyId) {
    const draft = versionDrafts[policyId];
    if (!draft?.versionLabel || !draft?.content) return;
    await api.post(`/policies/${policyId}/versions`, draft);
    setVersionDrafts((d) => ({ ...d, [policyId]: { versionLabel: '', content: '' } }));
    load();
  }

  function updateDraft(policyId, field, value) {
    setVersionDrafts((d) => ({ ...d, [policyId]: { ...d[policyId], [field]: value } }));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Manage Policies</h1>

      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Publish a new policy</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <input required placeholder="Code (e.g. WSP-07)" className="input-field" value={newPolicy.code} onChange={(e) => setNewPolicy((p) => ({ ...p, code: e.target.value }))} />
            <input required placeholder="Title" className="input-field sm:col-span-2" value={newPolicy.title} onChange={(e) => setNewPolicy((p) => ({ ...p, title: e.target.value }))} />
            <input required placeholder="Category" className="input-field" value={newPolicy.category} onChange={(e) => setNewPolicy((p) => ({ ...p, category: e.target.value }))} />
            <input required placeholder="Owner" className="input-field" value={newPolicy.owner} onChange={(e) => setNewPolicy((p) => ({ ...p, owner: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newPolicy.isDevicePolicy} onChange={(e) => setNewPolicy((p) => ({ ...p, isDevicePolicy: e.target.checked }))} />
              Links to live asset inventory (device-use policy)
            </label>
          </div>
          <textarea required placeholder="Policy content" rows={4} className="input-field" value={newPolicy.content} onChange={(e) => setNewPolicy((p) => ({ ...p, content: e.target.value }))} />
          <button type="submit" className="btn-primary">Publish policy</button>
        </form>
      </div>

      <div className="space-y-4">
        {policies.map((p) => (
          <div key={p.id} className="card">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">{p.code} — {p.title}</h3>
              <span className="badge-neutral">Current: v{p.version_label}</span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
              <input placeholder="New version label (e.g. 1.1)" className="input-field" value={versionDrafts[p.id]?.versionLabel || ''} onChange={(e) => updateDraft(p.id, 'versionLabel', e.target.value)} />
              <textarea placeholder="New version content" rows={2} className="input-field sm:col-span-2" value={versionDrafts[p.id]?.content || ''} onChange={(e) => updateDraft(p.id, 'content', e.target.value)} />
              <button className="btn-secondary" onClick={() => handlePublishVersion(p.id)}>Publish new version</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
