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

// Render (and most managed Postgres providers — Heroku, Supabase, etc.)
// terminate plain, unencrypted connections outright: any client that
// doesn't request SSL gets rejected with "SSL/TLS required" before it even
// reaches the query layer. A local Postgres install, on the other hand,
// is typically NOT configured with a certificate at all, so demanding SSL
// against localhost fails the opposite way.
//
// Rather than keying this off NODE_ENV (which is easy to forget to set
// correctly when running a one-off script like `npm run seed` from your
// own laptop against a *remote* database), we detect it directly from the
// connection string's host: localhost/127.0.0.1 => no SSL, anything else
// (a real hostname, e.g. Render's *.render.com) => SSL required.
//
// `rejectUnauthorized: false` is the standard, documented setting for
// Render/Heroku-style managed Postgres: it still encrypts the connection,
// it just doesn't attempt to verify the provider's certificate chain
// against a local CA bundle (these providers use certificates that a
// default Node install doesn't otherwise trust). This is NOT the same as
// having no encryption — traffic is still encrypted in transit, which is
// what WSP-02 (Data Protection Policy) requires.
const isLocalDatabase = /(localhost|127\.0\.0\.1)/.test(env.DATABASE_URL);

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
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
