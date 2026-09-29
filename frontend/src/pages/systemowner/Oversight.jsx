/**
 * Oversight.jsx  (System Owner "Oversight Dashboard")
 * ----------------------------------------------------------------------------
 * "Read-only access to compliance information, policy status, and relevant
 * system records for governance and oversight purposes" (Proposal Section
 * 7). Deliberately reuses the SAME read-only /api/dashboard/overview
 * endpoint as the Admin Overview page — there is no separate, richer data
 * source for this role because System Owner sees aggregate data ONLY,
 * never individual-level detail (Data Protection Policy WSP-02 §3.2).
 * ----------------------------------------------------------------------------
 */
import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import StatCard from '../../components/StatCard.jsx';

export default function Oversight() {
  const [overview, setOverview] = useState(null);
  useEffect(() => { api.get('/dashboard/overview').then((r) => setOverview(r.data)); }, []);

  if (!overview) return <p className="text-sm text-slate-500">Loading oversight dashboard…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Organisational Oversight</h1>
        <p className="text-sm text-slate-500">Aggregate compliance and activity data. This view is read-only, consistent with the System Owner role.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Active employees" value={overview.activeUsers} />
        <StatCard label="Policy acknowledgements" value={overview.totalAcknowledgements} />
        <StatCard label="Training modules completed" value={overview.completedModules} />
        <StatCard label="Failed logins (24h)" value={overview.failedLogins24h} tone={overview.failedLogins24h > 10 ? 'danger' : 'neutral'} />
      </div>
    </div>
  );
}
