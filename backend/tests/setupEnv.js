/**
 * tests/setupEnv.js
 * ----------------------------------------------------------------------------
 * The unit tests in this folder (rbac.test.js, password.test.js) test pure
 * logic and never touch a real database, but they still import modules that
 * import ../src/config/env.js, which fails fast if required environment
 * variables are missing (by design — see env.js's own comment block).
 *
 * Rather than relax that fail-fast check (which is a deliberate secure-
 * coding safeguard we want to KEEP for the real app), this Jest "setupFiles"
 * hook supplies harmless dummy values just for the test process, so CI can
 * run `npm test` with zero configuration and no live Postgres instance.
 * ----------------------------------------------------------------------------
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test-csrf-secret';
