/**
 * ConfirmDialog.jsx
 * ----------------------------------------------------------------------------
 * Generic confirmation modal. Used specifically to implement the required
 * "confirmation step for privilege escalation" (Proposal Section 8) when an
 * administrator changes a user's role, as well as for other destructive
 * actions (suspend/delete a user, reject an asset request).
 * ----------------------------------------------------------------------------
 */
import React from 'react';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="card w-full max-w-md">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
