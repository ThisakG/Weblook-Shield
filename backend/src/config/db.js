/**
 * db.js
 * ----------------------------------------------------------------------------
 * Single shared Postgres connection pool for the whole backend.
 *
 * WHY a pool, and why export a `query` helper:
 *   - Reusing one pool avoids exhausting Postgres connections under load
 *     (relevant to the Scalability/Performance NFRs).
 *   - EVERY query in this codebase goes through `pool.query(text, params)`
 *     with parameterised placeholders ($1, $2, ...) — never string
 *     concatenation — which is the primary secure-coding defence against
 *     SQL injection called for in Proposal Section 10.
 * ----------------------------------------------------------------------------
 */
const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Modest pool size appropriate for a pilot/demo deployment; can be raised
  // without any code changes if Weblook's headcount grows (Scalability NFR).
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  // A background/idle client error should not crash the whole process —
  // log it and let the pool recover, supporting the Availability NFR's
  // "graceful error handling rather than raw stack traces."
  console.error('Unexpected error on idle Postgres client', err);
});

module.exports = { pool };
