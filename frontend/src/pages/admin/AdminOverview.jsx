/**
 * AdminOverview.jsx  (Admin Dashboard landing page)
 * ----------------------------------------------------------------------------
 * "Monitoring and reporting dashboard for providing visibility into
 * compliance status and user activity" (Proposal Executive Summary).
 * Backed by GET /api/dashboard/overview, which aggregates everything into
 * one call to meet the Performance NFR's 2-second KPI-load target.
 * ----------------------------------------------------------------------------
 */
import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import StatCard from '../../components/StatCard.jsx';

export default function AdminOverview() {
  const [overview, setOverview] = useState(null);

  useEffect(() => { api.get('/dashboard/overview').then((r) => setOverview(r.data)); }, []);

  if (!overview) return <p className="text-sm text-slate-500">Loading overview…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Admin Overview</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Active users" value={overview.activeUsers} />
        <StatCard label="Locked accounts" value={overview.lockedUsers} tone={overview.lockedUsers ? 'danger' : 'neutral'} />
        <StatCard label="MFA-enabled users" value={overview.mfaEnabledUsers} tone="success" />
        <StatCard label="Failed logins (24h)" value={overview.failedLogins24h} tone={overview.failedLogins24h > 10 ? 'danger' : 'neutral'} />
        <StatCard label="Policies published" value={overview.totalPolicies} />
        <StatCard label="Policy acknowledgements" value={overview.totalAcknowledgements} />
        <StatCard label="Training modules completed" value={overview.completedModules} />
        <StatCard label="Pending asset requests" value={overview.pendingAssetRequests} tone={overview.pendingAssetRequests ? 'danger' : 'neutral'} />
      </div>
      <p className="text-xs text-slate-400">
        These KPIs power the "Analytics Dashboard" referenced throughout the proposal — e.g. failed logins here are the same
        counter that automatic account-lockout alerts feed into (WSP-04 §3.3).
      </p>
    </div>
  );
}
