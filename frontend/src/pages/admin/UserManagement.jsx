/**
 * UserManagement.jsx
 * ----------------------------------------------------------------------------
 * Implements Proposal Section 8's Admin Dashboard "User Management (RBAC)"
 * feature in full:
 *   - Searchable/filterable table (department/role/status/last login/MFA)
 *   - Create, lock/suspend, reactivate, delete accounts; force password
 *     reset; disable MFA in recovery scenarios
 *   - Role changes with a confirmation step for privilege escalation
 *   - Full change history per user (drill-down panel)
 * ----------------------------------------------------------------------------
 */
import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

const ROLES = ['employee', 'administrator', 'system_owner'];
const STATUSES = ['active', 'locked', 'suspended'];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null); // drill-down user id
  const [history, setHistory] = useState([]);
  const [pendingRoleChange, setPendingRoleChange] = useState(null); // { userId, newRole }
  const [createForm, setCreateForm] = useState({ fullName: '', email: '', department: '', role: 'employee' });
  const [tempPasswordNotice, setTempPasswordNotice] = useState(null);

  function load() {
    api.get('/users', { params: { search: search || undefined, role: roleFilter || undefined, status: statusFilter || undefined } })
      .then((r) => setUsers(r.data.users));
  }
  useEffect(load, [search, roleFilter, statusFilter]);

  async function openHistory(userId) {
    setSelected(userId);
    const { data } = await api.get(`/users/${userId}`);
    setHistory(data.history);
  }

  async function handleCreate(e) {
    e.preventDefault();
    const { data } = await api.post('/users', createForm);
    setTempPasswordNotice({ email: data.user.email, tempPassword: data.tempPassword });
    setCreateForm({ fullName: '', email: '', department: '', role: 'employee' });
    load();
  }

  async function changeStatus(userId, status) {
    await api.patch(`/users/${userId}/status`, { status });
    load();
  }

  function requestRoleChange(userId, newRole) {
    // Privilege-escalation confirmation step — required whenever the NEW
    // role is more privileged than 'employee' (i.e. administrator or
    // system_owner), per Proposal Section 8.
    setPendingRoleChange({ userId, newRole });
  }

  async function confirmRoleChange() {
    await api.patch(`/users/${pendingRoleChange.userId}/role`, { role: pendingRoleChange.newRole, confirm: 'true' });
    setPendingRoleChange(null);
    load();
  }

  async function forceReset(userId) {
    await api.post(`/users/${userId}/force-password-reset`);
    load();
  }

  async function disableMfa(userId) {
    await api.post(`/users/${userId}/disable-mfa`);
    load();
  }

  async function deleteUser(userId) {
    await api.delete(`/users/${userId}`);
    setSelected(null);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">User Management</h1>

      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Create user (admin-provisioned invite)</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <input required placeholder="Full name" className="input-field" value={createForm.fullName} onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))} />
          <input required type="email" placeholder="Email" className="input-field" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} />
          <input placeholder="Department" className="input-field" value={createForm.department} onChange={(e) => setCreateForm((f) => ({ ...f, department: e.target.value }))} />
          <select className="input-field" value={createForm.role} onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="submit" className="btn-primary">Create</button>
        </form>
        {tempPasswordNotice && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
            Account created for {tempPasswordNotice.email}. Temporary password (share out-of-band, shown once): <code className="font-mono">{tempPasswordNotice.tempPassword}</code>
          </p>
        )}
      </div>

      <div className="card">
        <div className="mb-3 flex flex-wrap gap-3">
          <input placeholder="Search name or email…" className="input-field max-w-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input-field max-w-[10rem]" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="input-field max-w-[10rem]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="py-2">Name</th><th className="py-2">Department</th><th className="py-2">Role</th>
              <th className="py-2">Status</th><th className="py-2">MFA</th><th className="py-2">Last login</th><th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-2"><button className="text-brand-600 hover:underline" onClick={() => openHistory(u.id)}>{u.full_name}</button><div className="text-xs text-slate-400">{u.email}</div></td>
                <td className="py-2">{u.department || '—'}</td>
                <td className="py-2">
                  <select className="input-field py-1" value={u.role} onChange={(e) => requestRoleChange(u.id, e.target.value)}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="py-2">
                  <select className="input-field py-1" value={u.status} onChange={(e) => changeStatus(u.id, e.target.value)}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="py-2">{u.mfa_enabled ? <span className="badge-success">On</span> : <span className="badge-neutral">Off</span>}</td>
                <td className="py-2 text-xs">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}</td>
                <td className="py-2 space-x-2 whitespace-nowrap">
                  <button className="text-xs text-brand-600 hover:underline" onClick={() => forceReset(u.id)}>Force reset</button>
                  <button className="text-xs text-brand-600 hover:underline" onClick={() => disableMfa(u.id)}>Disable MFA</button>
                  <button className="text-xs text-brand-700 hover:underline" onClick={() => deleteUser(u.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="card">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Change history</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {history.map((h) => (
              <li key={h.id} className="py-2">
                <span className="font-medium">{h.action}</span> by {h.actor_email || 'system'} &middot; {new Date(h.created_at).toLocaleString()}
                {h.details && <span className="ml-2 text-slate-400">{JSON.stringify(h.details)}</span>}
              </li>
            ))}
            {!history.length && <p className="text-slate-500">No recorded history for this user yet.</p>}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingRoleChange}
        title="Confirm privilege change"
        message={pendingRoleChange ? `You are about to change this user's role to "${pendingRoleChange.newRole}". This may grant elevated system access. Continue?` : ''}
        confirmLabel="Yes, change role"
        danger
        onConfirm={confirmRoleChange}
        onCancel={() => setPendingRoleChange(null)}
      />
    </div>
  );
}
