/**
 * audit.service.js
 * ----------------------------------------------------------------------------
 * Read-side of the append-only audit trail: "Activity Logging and
 * Compliance Monitoring ... records that can be exported for internal
 * review, reporting, and audit purposes" (Proposal Section 5, Scope).
 *
 * There is deliberately NO update/delete function anywhere in this file —
 * the log is written only by middleware/auditLogger.js and is otherwise
 * read-only, which is what makes it "append-only" in practice.
 * ----------------------------------------------------------------------------
 */
const { pool } = require('../../config/db');

async function listAuditLog({ action, from, to, limit }) {
  const conditions = [];
  const params = [];

  if (action) { params.push(action); conditions.push(`action = $${params.length}`); }
  if (from) { params.push(from); conditions.push(`created_at >= $${params.length}`); }
  if (to) { params.push(to); conditions.push(`created_at <= $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(Math.min(parseInt(limit, 10) || 200, 1000)); // hard cap to protect performance
  const { rows } = await pool.query(
    `SELECT id, actor_email, action, target_type, target_id, details, ip_address, created_at
     FROM audit_log ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
  return rows;
}

// Failed-login KPI for the Analytics/Monitoring Dashboard, matching
// Proposal Section 8: "Account lockout after repeated failed login
// attempts, with automatic alerting to the Analytics Dashboard."
async function getFailedLoginKpi(hours = 24) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS failed_logins
     FROM audit_log
     WHERE action IN ('LOGIN_FAILED', 'LOGIN_FAILED_MFA') AND created_at >= now() - ($1 || ' hours')::interval`,
    [hours]
  );
  return { hours, failedLogins: Number(rows[0].failed_logins) };
}

async function getRecentActivitySummary() {
  const { rows } = await pool.query(
    `SELECT action, COUNT(*) AS count
     FROM audit_log
     WHERE created_at >= now() - interval '7 days'
     GROUP BY action
     ORDER BY count DESC
     LIMIT 10`
  );
  return rows;
}

module.exports = { listAuditLog, getFailedLoginKpi, getRecentActivitySummary };
