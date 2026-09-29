/**
 * assets.service.js
 * ----------------------------------------------------------------------------
 * Implements the "asset requesting mechanism attached to the asset
 * inventory so employees request an asset they are entitled to and an
 * admin acknowledges and fulfils the request from the same workflow"
 * (Proposal Section 8), and admin "asset-inventory management".
 * ----------------------------------------------------------------------------
 */
const { pool } = require('../../config/db');

async function listInventory() {
  const { rows } = await pool.query(
    `SELECT a.id, a.asset_tag, a.asset_type, a.description, a.status,
            u.full_name AS assigned_to_name, u.id AS assigned_to_id
     FROM assets a LEFT JOIN users u ON u.id = a.assigned_to
     ORDER BY a.asset_type, a.asset_tag`
  );
  return rows;
}

async function listMyAssets(userId) {
  const { rows } = await pool.query(
    `SELECT id, asset_tag, asset_type, description, status FROM assets WHERE assigned_to = $1 ORDER BY asset_type`,
    [userId]
  );
  return rows;
}

async function createRequest(userId, { assetType, justification }) {
  const { rows } = await pool.query(
    `INSERT INTO asset_requests (user_id, asset_type, justification) VALUES ($1, $2, $3) RETURNING id, status, requested_at`,
    [userId, assetType, justification || null]
  );
  return rows[0];
}

async function listMyRequests(userId) {
  const { rows } = await pool.query(
    `SELECT id, asset_type, justification, status, requested_at, resolved_at FROM asset_requests WHERE user_id = $1 ORDER BY requested_at DESC`,
    [userId]
  );
  return rows;
}

async function listAllRequests(status) {
  const params = [];
  let where = '';
  if (status) { params.push(status); where = 'WHERE ar.status = $1'; }
  const { rows } = await pool.query(
    `SELECT ar.id, ar.asset_type, ar.justification, ar.status, ar.requested_at,
            u.id AS user_id, u.full_name, u.email
     FROM asset_requests ar JOIN users u ON u.id = ar.user_id
     ${where}
     ORDER BY ar.requested_at DESC`,
    params
  );
  return rows;
}

// Resolving a request (approve/reject/fulfil) is done in one workflow step
// as required by the proposal: "an admin acknowledges and fulfils the
// request from the same workflow." Fulfilling optionally assigns a
// specific physical asset from the inventory to the requester.
async function resolveRequest(requestId, { status, resolvedBy, assetId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const reqRow = await client.query(
      `UPDATE asset_requests SET status = $1, resolved_by = $2, resolved_at = now() WHERE id = $3 RETURNING user_id`,
      [status, resolvedBy, requestId]
    );
    if (!reqRow.rows.length) {
      const err = new Error('Asset request not found.');
      err.statusCode = 404;
      throw err;
    }
    if (status === 'fulfilled' && assetId) {
      await client.query(
        `UPDATE assets SET assigned_to = $1, status = 'assigned' WHERE id = $2`,
        [reqRow.rows[0].user_id, assetId]
      );
    }
    await client.query('COMMIT');
    return reqRow.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function createAsset({ assetTag, assetType, description }) {
  const { rows } = await pool.query(
    `INSERT INTO assets (asset_tag, asset_type, description) VALUES ($1, $2, $3) RETURNING id`,
    [assetTag, assetType, description || null]
  );
  return rows[0].id;
}

module.exports = { listInventory, listMyAssets, createRequest, listMyRequests, listAllRequests, resolveRequest, createAsset };
