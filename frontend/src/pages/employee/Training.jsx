/**
 * Training.jsx — lists the six security-awareness modules with the
 * employee's own progress ("short guided lessons ... followed by quizzes",
 * Proposal Section 8).
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import YouTubeCard from '../../components/YouTubeCard';

export default function Training() {
  const [modules, setModules] = useState([]);
  useEffect(() => { api.get('/training').then((r) => setModules(r.data.modules)); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Security Awareness Training</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {modules.map((m) => (
          // NOTE: this card is a <div>, not a <Link>, specifically so the
          // YouTube thumbnail below (its own <a> tag, opening a new tab)
          // never ends up nested inside another clickable link — nested
          // anchors are invalid HTML and produce unpredictable click
          // behaviour in every browser. Navigation to the module itself
          // happens via the explicit "Open module ->" link instead.
          <div key={m.id} className="card transition hover:ring-brand-300">
            {m.video_url && (
              <YouTubeCard url={m.video_url} title={m.title} variant="compact" />
            )}
            <div className="mt-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">{m.title}</h2>
              <span className={m.status === 'completed' ? 'badge-success' : m.status === 'in_progress' ? 'badge-warning' : 'badge-neutral'}>
                {m.status.replace('_', ' ')}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{m.description}</p>
            <p className="mt-2 text-xs text-slate-400">~{m.estimated_minutes} minutes &middot; Pass mark {m.pass_mark_percent}%</p>
            <Link to={`/training/${m.id}`} className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">
              Open module &rarr;
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
