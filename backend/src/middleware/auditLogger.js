/**
 * auditLogger.js
 * ----------------------------------------------------------------------------
 * Writes an append-only row to `audit_log` for any security-relevant event.
 * Called explicitly from inside controllers (login, role change, policy
 * publish, acknowledgement, etc.) rather than being a blanket middleware,
 * because the AUDITABILITY NFR requires meaningful, well-labelled actions
 * ("ROLE_CHANGED", "POLICY_PUBLISHED") rather than a raw HTTP method/path.
 *
 * Failures to write an audit row are logged but never thrown back to the
 * caller — an audit-logging hiccup must not block the underlying user
 * action (e.g. we would rather a login succeed with a missed log line than
 * fail the login entirely because of a logging error).
 * ----------------------------------------------------------------------------
 */

const { pool } = require('../config/db');
const logger = require('../utils/logger');

async function recordAudit({
  actorId,
  actorEmail,
  action,
  targetType,
  targetId,
  details,
  ipAddress
}) {
  try {
    let resolvedActorEmail = actorEmail || null;

    /*
     * Some controllers provide only actorId.
     * If an authenticated actor exists but their email was not explicitly
     * supplied, resolve the email from the users table before writing the
     * audit entry.
     *
     * This allows user-driven actions such as POLICY_ACKNOWLEDGED,
     * QUIZ_PASSED and ASSET_REQUESTED to display the actual user's email
     * instead of falling back to "system".
     */
    if (actorId && !resolvedActorEmail) {
      const { rows } = await pool.query(
        `SELECT email
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [actorId]
      );

      if (rows.length > 0) {
        resolvedActorEmail = rows[0].email;
      }
    }

    await pool.query(
      `INSERT INTO audit_log
       (
         actor_id,
         actor_email,
         action,
         target_type,
         target_id,
         details,
         ip_address
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        actorId || null,
        resolvedActorEmail,
        action,
        targetType || null,
        targetId || null,
        details ? JSON.stringify(details) : null,
        ipAddress || null
      ]
    );
  } catch (err) {
    logger.error(
      'Failed to write audit log entry (action continued regardless):',
      err
    );
  }
}

module.exports = { recordAudit };