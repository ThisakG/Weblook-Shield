/**
 * Dashboard.jsx  (Employee "User Dashboard")
 * ----------------------------------------------------------------------------
 * "The employee-facing home base. Every item below is visible on a single
 * self-service screen" (Proposal Section 8): compliance status, training
 * progress, and a quick summary of asset requests — all in one view.
 * ----------------------------------------------------------------------------
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';
import StatCard from '../../components/StatCard.jsx';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [compliance, setCompliance] = useState([]);
  const [modules, setModules] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    api.get('/policies/compliance/me').then((r) => setCompliance(r.data.status));
    api.get('/training').then((r) => setModules(r.data.modules));
    api.get('/assets/requests/mine').then((r) => setRequests(r.data.requests));
  }, []);

  const outstandingPolicies = compliance.filter((c) => !c.acknowledged_at);
  const completedModules = modules.filter((m) => m.status === 'completed');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.fullName?.split(' ')[0]}</h1>
        <p className="text-sm text-slate-500">Here's your personal compliance and training snapshot.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Policies outstanding" value={outstandingPolicies.length} tone={outstandingPolicies.length ? 'danger' : 'success'} />
        <StatCard label="Training modules completed" value={`${completedModules.length}/${modules.length}`} tone="neutral" />
        <StatCard label="Asset requests pending" value={requests.filter((r) => r.status === 'pending').length} tone="neutral" />
      </div>

      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Policy acknowledgement status</h2>
        <ul className="divide-y divide-slate-100">
          {compliance.map((c) => (
            <li key={c.version_id} className="flex items-center justify-between py-2 text-sm">
              <span>{c.code} — {c.title} <span className="text-slate-400">(v{c.version_label})</span></span>
              {c.acknowledged_at
                ? <span className="badge-success">Acknowledged</span>
                : <Link to="/policies" className="badge-danger hover:underline">Action needed</Link>}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Security awareness progress</h2>
        <ul className="divide-y divide-slate-100">
          {modules.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2 text-sm">
              <Link to={`/training/${m.id}`} className="hover:underline">{m.title}</Link>
              <span className={m.status === 'completed' ? 'badge-success' : m.status === 'in_progress' ? 'badge-warning' : 'badge-neutral'}>
                {m.status.replace('_', ' ')}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
