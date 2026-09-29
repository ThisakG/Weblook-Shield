/**
 * policies.service.js
 * ----------------------------------------------------------------------------
 * Backs the "Information Policy Documentation Section" (Proposal Section
 * 8): searchable library, versioning with a "current version" indicator,
 * and mandatory timestamped acknowledgement tied to a specific version.
 * ----------------------------------------------------------------------------
 */
const { pool } = require('../../config/db');

// Returns the policy library with each policy's CURRENT version attached,
// optionally filtered by a search term across title/category/code — this
// is the "centralized, searchable library ... categorized and tagged for
// quick retrieval" requirement.
async function listPolicies({ search }) {
  const params = [];
  let whereClause = '';
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    whereClause = `WHERE LOWER(p.title) LIKE $1 OR LOWER(p.category) LIKE $1 OR LOWER(p.code) LIKE $1`;
  }
  const { rows } = await pool.query(
    `SELECT p.id, p.code, p.title, p.category, p.owner, p.is_device_policy,
            pv.id AS current_version_id, pv.version_label, pv.published_at
     FROM policies p
     JOIN policy_versions pv ON pv.policy_id = p.id AND pv.is_current = TRUE
     ${whereClause}
     ORDER BY p.code ASC`,
    params
  );
  return rows;
}

async function getPolicyDetail(policyId, userId) {
  const { rows } = await pool.query(
    `SELECT p.id, p.code, p.title, p.category, p.owner, p.is_device_policy,
            pv.id AS version_id, pv.version_label, pv.content, pv.published_at
     FROM policies p
     JOIN policy_versions pv ON pv.policy_id = p.id AND pv.is_current = TRUE
     WHERE p.id = $1`,
    [policyId]
  );
  const policy = rows[0];
  if (!policy) return null;

  // Tells the frontend whether THIS user has acknowledged THIS specific
  // current version — acknowledging an old version never counts as current.
  const ackCheck = await pool.query(
    `SELECT acknowledged_at FROM policy_acknowledgements WHERE user_id = $1 AND policy_version_id = $2`,
    [userId, policy.version_id]
  );
  policy.acknowledgedAt = ackCheck.rows[0]?.acknowledged_at || null;

  // If this is the device-use (AUP) policy, attach the live asset inventory
  // so the reading employee can see exactly which devices it covers —
  // Proposal: "Acceptable Device Use Policy section directly linked to a
  // live asset inventory."
  if (policy.is_device_policy) {
    const assets = await pool.query(`SELECT id, asset_tag, asset_type, description, status FROM assets ORDER BY asset_type, asset_tag`);
    policy.linkedAssets = assets.rows;
  }
  return policy;
}

async function acknowledgePolicy(userId, versionId) {
  // ON CONFLICT DO NOTHING makes acknowledging an already-acknowledged
  // version idempotent rather than throwing a duplicate-key error.
  const { rows } = await pool.query(
    `INSERT INTO policy_acknowledgements (user_id, policy_version_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, policy_version_id) DO NOTHING
     RETURNING acknowledged_at`,
    [userId, versionId]
  );
  if (rows.length) return rows[0].acknowledged_at;
  const existing = await pool.query(`SELECT acknowledged_at FROM policy_acknowledgements WHERE user_id=$1 AND policy_version_id=$2`, [userId, versionId]);
  return existing.rows[0]?.acknowledged_at;
}

// Personal compliance view for the User Dashboard: every current policy
// version, and whether THIS employee has acknowledged it yet.
async function getComplianceStatusForUser(userId) {
  const { rows } = await pool.query(
    `SELECT p.id AS policy_id, p.code, p.title, pv.id AS version_id, pv.version_label,
            ack.acknowledged_at
     FROM policies p
     JOIN policy_versions pv ON pv.policy_id = p.id AND pv.is_current = TRUE
     LEFT JOIN policy_acknowledgements ack ON ack.policy_version_id = pv.id AND ack.user_id = $1
     ORDER BY p.code`,
    [userId]
  );
  return rows;
}

// Publishes a brand-new version of an existing policy: marks the previous
// current version retired and inserts the new one as current, inside a
// transaction so the "exactly one current version" invariant always holds.
async function publishNewVersion(policyId, { versionLabel, content, publishedBy }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE policy_versions SET is_current = FALSE, retired_at = now() WHERE policy_id = $1 AND is_current = TRUE`,
      [policyId]
    );
    const { rows } = await client.query(
      `INSERT INTO policy_versions (policy_id, version_label, content, is_current, published_by)
       VALUES ($1, $2, $3, TRUE, $4) RETURNING id, version_label, published_at`,
      [policyId, versionLabel, content, publishedBy]
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function createPolicy({ code, title, category, owner, isDevicePolicy, versionLabel, content, publishedBy }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const policyRow = await client.query(
      `INSERT INTO policies (code, title, category, owner, is_device_policy) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [code, title, category, owner, !!isDevicePolicy]
    );
    const policyId = policyRow.rows[0].id;
    await client.query(
      `INSERT INTO policy_versions (policy_id, version_label, content, is_current, published_by) VALUES ($1,$2,$3,TRUE,$4)`,
      [policyId, versionLabel || '1.0', content, publishedBy]
    );
    await client.query('COMMIT');
    return policyId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Overdue-acknowledgement report used to drive the automated reminder
// notifications ("Automated reminder notifications for employees with
// outstanding acknowledgements") and the Admin/System Owner dashboards.
async function listOutstandingAcknowledgements() {
  const { rows } = await pool.query(
    `SELECT u.id AS user_id, u.full_name, u.email, p.code, p.title, pv.id AS version_id
     FROM users u
     CROSS JOIN policies p
     JOIN policy_versions pv ON pv.policy_id = p.id AND pv.is_current = TRUE
     LEFT JOIN policy_acknowledgements ack ON ack.policy_version_id = pv.id AND ack.user_id = u.id
     WHERE u.status = 'active' AND ack.id IS NULL
     ORDER BY u.full_name, p.code`
  );
  return rows;
}

module.exports = {
  listPolicies, getPolicyDetail, acknowledgePolicy, getComplianceStatusForUser,
  publishNewVersion, createPolicy, listOutstandingAcknowledgements,
};
