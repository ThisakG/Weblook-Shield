/**
 * AuditLog.jsx
 * ----------------------------------------------------------------------------
 * Read-only view of the append-only audit trail, used by BOTH administrators
 * and the system owner (route-gated by READ_ONLY_ROLES server-side). "This
 * page never renders any mutating control — there is nothing to click that
 * changes a row, because the backend route itself has none (see
 * backend/src/modules/audit/audit.routes.js).
 * ----------------------------------------------------------------------------
 */
import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [actionFilter, setActionFilter] = useState('');

  function load() {
    api.get('/audit', { params: { action: actionFilter || undefined } }).then((r) => setEntries(r.data.entries));
  }
  useEffect(load, [actionFilter]);

  async function exportCsv() {
  const res = await api.get(
    `/audit/export.csv${actionFilter ? `?action=${actionFilter}` : ''}`,
    { responseType: 'blob' } // tell axios to hand back raw file bytes, not try to parse JSON
  );
  // Build a temporary, local object URL for the downloaded file — this
  // happens entirely in memory, no second network request, so it carries
  // no auth requirement of its own.
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'audit-log.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
        <button className="btn-secondary" onClick={exportCsv}>Export CSV</button>
      </div>

      <div className="card">
        <input
          className="input-field mb-3 max-w-xs" placeholder="Filter by action (e.g. LOGIN_FAILED)"
          value={actionFilter} onChange={(e) => setActionFilter(e.target.value.toUpperCase())}
        />
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500"><tr><th className="py-2">Time</th><th className="py-2">Actor</th><th className="py-2">Action</th><th className="py-2">Target</th><th className="py-2">IP</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="py-1.5 text-xs">{new Date(e.created_at).toLocaleString()}</td>
                <td className="py-1.5">{e.actor_email || 'system'}</td>
                <td className="py-1.5 font-mono text-xs">{e.action}</td>
                <td className="py-1.5 text-xs text-slate-500">{e.target_type ? `${e.target_type}:${e.target_id}` : '—'}</td>
                <td className="py-1.5 text-xs text-slate-400">{e.ip_address || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
