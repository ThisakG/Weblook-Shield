/**
 * PolicyDetail.jsx
 * ----------------------------------------------------------------------------
 * Reads the full current version of a policy and provides the mandatory
 * digital acknowledgement action ("I have read and understood this
 * policy"). If this is the AUP (is_device_policy), the linked live asset
 * inventory is shown directly beneath the policy text, matching Proposal
 * Section 8's "Acceptable Device Use Policy section directly linked to a
 * live asset inventory."
 * ----------------------------------------------------------------------------
 */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';

export default function PolicyDetail() {
  const { id } = useParams();
  const [policy, setPolicy] = useState(null);
  const [acking, setAcking] = useState(false);

  function load() {
    api.get(`/policies/${id}`).then((r) => setPolicy(r.data.policy));
  }
  useEffect(load, [id]);

  async function handleAcknowledge() {
    setAcking(true);
    try {
      await api.post(`/policies/${id}/acknowledge`, { versionId: policy.version_id });
      load();
    } finally {
      setAcking(false);
    }
  }

  if (!policy) return <p className="text-sm text-slate-500">Loading policy…</p>;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="badge-neutral">{policy.code}</span>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{policy.title}</h1>
            <p className="text-sm text-slate-500">Owner: {policy.owner} &middot; Version {policy.version_label} &middot; Published {new Date(policy.published_at).toLocaleDateString()}</p>
          </div>
          {policy.acknowledgedAt ? (
            <span className="badge-success">Acknowledged {new Date(policy.acknowledgedAt).toLocaleDateString()}</span>
          ) : (
            <button className="btn-primary" onClick={handleAcknowledge} disabled={acking}>
              {acking ? 'Recording…' : 'I have read and understood this policy'}
            </button>
          )}
        </div>
        <div className="prose prose-slate mt-6 max-w-none whitespace-pre-line text-sm text-slate-700">
          {policy.content}
        </div>
      </div>

      {policy.is_device_policy && (
        <div className="card">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Live Asset Inventory (covered by this policy)</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr><th className="py-1">Tag</th><th className="py-1">Type</th><th className="py-1">Description</th><th className="py-1">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {policy.linkedAssets?.map((a) => (
                <tr key={a.id}>
                  <td className="py-1.5 font-mono text-xs">{a.asset_tag}</td>
                  <td className="py-1.5">{a.asset_type}</td>
                  <td className="py-1.5 text-slate-500">{a.description}</td>
                  <td className="py-1.5 capitalize">{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
