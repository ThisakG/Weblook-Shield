/**
 * env.js
 * ----------------------------------------------------------------------------
 * Centralises reading of environment variables in ONE place.
 *
 * WHY: Secure-coding requirement from the proposal (Section 10): "Secrets
 * (DB credentials, JWT signing keys) managed via environment variables ...
 * never committed to source control." By funnelling every process.env read
 * through this module we (a) fail fast with a clear error if something
 * required is missing, instead of a confusing crash deep in some module,
 * and (b) give the rest of the codebase one obvious place to import config
 * from, rather than scattering process.env.X across 30 files.
 * ----------------------------------------------------------------------------
 */
require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    // Fail loudly at startup rather than silently using `undefined` as a
    // JWT secret or DB password later on.
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),

  // Database connection — never hard-code credentials here.
  DATABASE_URL: required('DATABASE_URL'),

  // JWT signing secrets. Access tokens are short-lived; refresh tokens are
  // longer-lived but stored hashed server-side so they can be revoked.
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

  // CSRF double-submit cookie secret.
  CSRF_SECRET: required('CSRF_SECRET'),

  // Comma-separated list of allowed frontend origins for CORS.
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Account lockout policy (feeds NFR: Security + Analytics Dashboard KPI).
  MAX_FAILED_LOGIN_ATTEMPTS: parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5', 10),
  LOCKOUT_DURATION_MINUTES: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15', 10),

  // bcrypt work factor — 12 is a reasonable balance of security vs latency
  // for a demo/pilot deployment per the Performance NFR (sub-2s KPI loads).
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
};
