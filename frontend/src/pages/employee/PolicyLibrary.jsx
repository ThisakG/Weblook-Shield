/**
 * PolicyLibrary.jsx — searchable list of current policy versions
 * ("centralized, searchable library ... categorized ... for quick
 * retrieval", Proposal Section 8).
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

export default function PolicyLibrary() {
  const [policies, setPolicies] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      api.get('/policies', { params: { search: search || undefined } }).then((r) => setPolicies(r.data.policies));
    }, 250); // small debounce so typing doesn't fire a request per keystroke
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Policy Library</h1>
        <input
          className="input-field max-w-xs" placeholder="Search by title, category or code…"
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {policies.map((p) => (
          <Link key={p.id} to={`/policies/${p.id}`} className="card block transition hover:ring-brand-300">
            <div className="flex items-center justify-between">
              <span className="badge-neutral">{p.code}</span>
              {p.is_device_policy && <span className="badge-warning">Linked to Asset Inventory</span>}
            </div>
            <h2 className="mt-2 font-semibold text-slate-900">{p.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{p.category} &middot; Owner: {p.owner}</p>
            <p className="mt-1 text-xs text-slate-400">Current version {p.version_label} &middot; published {new Date(p.published_at).toLocaleDateString()}</p>
          </Link>
        ))}
        {!policies.length && <p className="text-sm text-slate-500">No policies match your search.</p>}
      </div>
    </div>
  );
}
