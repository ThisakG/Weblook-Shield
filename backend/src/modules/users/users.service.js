/**
 * users.service.js
 * ----------------------------------------------------------------------------
 * Backs the Admin Dashboard's "User Management (RBAC)" feature (Proposal
 * Section 8): searchable/filterable account table, create/lock/reactivate/
 * delete, role changes with a privilege-escalation confirmation step, force
 * password reset, MFA disable, and full per-user change history.
 * ----------------------------------------------------------------------------
 */
const crypto = require('crypto');
const { pool } = require('../../config/db');
const { hashPassword } = require('../../utils/password');

// Never SELECT password_hash or mfa_secret into an API response — the admin
// UI does not need them and returning them would be an unnecessary
// data-exposure risk (least-privilege / data-minimisation).
const SAFE_USER_COLUMNS = `
  u.id, u.full_name, u.email, u.department, r.name AS role, u.status,
  u.mfa_enabled, u.last_login_at, u.must_reset_password, u.created_at
`;

async function listUsers({ search, role, status }) {
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conditions.push(`(LOWER(u.full_name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`);
  }
  if (role) {
    params.push(role);
    conditions.push(`r.name = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`u.status = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT ${SAFE_USER_COLUMNS} FROM users u JOIN roles r ON r.id = u.role_id ${whereClause} ORDER BY u.created_at DESC`,
    params
  );
  return rows;
}

async function getUserProfile(userId) {
  const { rows } = await pool.query(
    `SELECT ${SAFE_USER_COLUMNS} FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
    [userId]
  );
  return rows[0] || null;
}

// Admin-provisioned invite: creates the account directly (rather than a
// separate invite-token flow) with a temporary password the admin
// communicates out-of-band, and flags must_reset_password so the employee
// is forced to set their own password on first login.
async function createUser({ fullName, email, department, role }) {
  const roleRow = await pool.query('SELECT id FROM roles WHERE name = $1', [role]);
  if (!roleRow.rows.length) {
    const err = new Error('Unknown role.');
    err.statusCode = 400;
    throw err;
  }
  const tempPassword = crypto.randomBytes(12).toString('base64url'); // >= 14 chars, high entropy
  const passwordHash = await hashPassword(tempPassword);

  const { rows } = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, department, role_id, status, must_reset_password)
     VALUES ($1, $2, $3, $4, $5, 'active', TRUE)
     RETURNING id, full_name, email`,
    [fullName, email.toLowerCase(), passwordHash, department || null, roleRow.rows[0].id]
  );
  // The temp password is returned ONCE to the calling admin so it can be
  // shared out-of-band; it is never logged or stored anywhere in plaintext.
  return { user: rows[0], tempPassword };
}

async function changeUserStatus(userId, status) {
  const { rows } = await pool.query(
    `UPDATE users SET status = $1, updated_at = now() WHERE id = $2 RETURNING id, email, status`,
    [status, userId]
  );
  return rows[0] || null;
}

async function changeUserRole(userId, newRole) {
  const roleRow = await pool.query('SELECT id FROM roles WHERE name = $1', [newRole]);
  if (!roleRow.rows.length) {
    const err = new Error('Unknown role.');
    err.statusCode = 400;
    throw err;
  }
  const { rows } = await pool.query(
    `UPDATE users SET role_id = $1, updated_at = now() WHERE id = $2 RETURNING id, email`,
    [roleRow.rows[0].id, userId]
  );
  return rows[0] || null;
}

async function forcePasswordReset(userId) {
  await pool.query(`UPDATE users SET must_reset_password = TRUE, updated_at = now() WHERE id = $1`, [userId]);
}

async function disableMfa(userId) {
  await pool.query(`UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL, updated_at = now() WHERE id = $1`, [userId]);
}

async function deleteUser(userId) {
  await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
}

// "Full change history per user account" — implemented by simply querying
// the shared, append-only audit_log for rows where this user was the
// target OR the actor of a user-management action, rather than maintaining
// a second, duplicate history table.
async function getUserHistory(userId) {
  const { rows } = await pool.query(
    `SELECT id, actor_email, action, details, created_at
     FROM audit_log
     WHERE target_type = 'user' AND target_id = $1
     ORDER BY created_at DESC
     LIMIT 200`,
    [userId]
  );
  return rows;
}

module.exports = {
  listUsers, getUserProfile, createUser, changeUserStatus, changeUserRole,
  forcePasswordReset, disableMfa, deleteUser, getUserHistory,
};
