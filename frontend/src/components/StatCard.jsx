/**
 * StatCard.jsx — small reusable KPI tile used across the Admin Overview,
 * System Owner Oversight, and Employee dashboards, so every "number in a
 * box" on the platform looks and behaves consistently.
 */
import React from 'react';

export default function StatCard({ label, value, tone = 'neutral' }) {
  const toneClasses = {
    neutral: 'text-slate-900',
    danger: 'text-brand-600',
    success: 'text-emerald-600',
  };
  return (
    <div className="card">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${toneClasses[tone]}`}>{value}</p>
    </div>
  );
}
