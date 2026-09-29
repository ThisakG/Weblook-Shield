/**
 * dashboard.service.js
 * ----------------------------------------------------------------------------
 * Aggregates KPIs for the Admin/System Owner "Monitoring and reporting
 * dashboard for providing visibility into compliance status and user
 * activity" (Proposal Executive Summary / Scope). Combines counts from
 * across modules into a single, fast call so the frontend dashboard can
 * render in one round trip — supporting the Performance NFR's "Dashboard
 * views should load key KPIs within 2 seconds."
 * ----------------------------------------------------------------------------
 */
const { pool } = require('../../config/db');

async function getOverview() {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE status = 'active') AS active_users,
      (SELECT COUNT(*) FROM users WHERE status = 'locked') AS locked_users,
      (SELECT COUNT(*) FROM users WHERE status = 'suspended') AS suspended_users,
      (SELECT COUNT(*) FROM users WHERE mfa_enabled = TRUE) AS mfa_enabled_users,
      (SELECT COUNT(*) FROM policies) AS total_policies,
      (SELECT COUNT(*) FROM policy_acknowledgements) AS total_acknowledgements,
      (SELECT COUNT(*) FROM training_modules) AS total_modules,
      (SELECT COUNT(*) FROM training_progress WHERE status = 'completed') AS completed_modules,
      (SELECT COUNT(*) FROM asset_requests WHERE status = 'pending') AS pending_asset_requests,
      (SELECT COUNT(*) FROM audit_log WHERE action IN ('LOGIN_FAILED','LOGIN_FAILED_MFA') AND created_at >= now() - interval '24 hours') AS failed_logins_24h
  `);
  const r = rows[0];
  return {
    activeUsers: Number(r.active_users),
    lockedUsers: Number(r.locked_users),
    suspendedUsers: Number(r.suspended_users),
    mfaEnabledUsers: Number(r.mfa_enabled_users),
    totalPolicies: Number(r.total_policies),
    totalAcknowledgements: Number(r.total_acknowledgements),
    totalModules: Number(r.total_modules),
    completedModules: Number(r.completed_modules),
    pendingAssetRequests: Number(r.pending_asset_requests),
    failedLogins24h: Number(r.failed_logins_24h),
  };
}

module.exports = { getOverview };
