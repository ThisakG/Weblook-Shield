/**
 * auth.service.js
 * ----------------------------------------------------------------------------
 * All database/business logic for authentication lives here, kept separate
 * from auth.controller.js (which only deals with HTTP request/response).
 * This separation lets the RBAC/auth unit tests (backend/tests/auth.test.js)
 * exercise the logic without spinning up an HTTP server.
 * ----------------------------------------------------------------------------
 */
const { pool } = require('../../config/db');
const { hashPassword, verifyPassword } = require('../../utils/password');
const { signAccessToken, signRefreshToken, hashToken, verifyRefreshToken } = require('../../utils/jwt');
const { verifyTotpToken } = require('../../utils/totp');
const env = require('../../config/env');

async function findUserByEmail(email) {
  const { rows } = await pool.query(
    `SELECT u.*, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE email = $1`,
    [email.toLowerCase()]
  );
  return rows[0] || null;
}

async function findUserById(id) {
  const { rows } = await pool.query(
    `SELECT u.*, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
    [id]
  );
  return rows[0] || null;
}

// Registration always creates an 'employee' — administrators are created by
// an existing administrator via the User Management module, never via
// public self-registration. This mirrors WSP-05's access-control principle
// that privileged roles are provisioned deliberately, not self-assigned.
async function registerEmployee({ fullName, email, password, department }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    const err = new Error('An account with this email already exists.');
    err.statusCode = 409;
    throw err;
  }
  const passwordHash = await hashPassword(password);
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, department, role_id, status)
     VALUES ($1, $2, $3, $4, 1, 'active')
     RETURNING id, full_name, email, department`,
    [fullName, email.toLowerCase(), passwordHash, department || null]
  );
  return rows[0];
}

// Checks whether the account is currently within its temporary lockout
// window (NFR-Security: "Account lockout after repeated failed login
// attempts").
function isCurrentlyLocked(user) {
  return user.locked_until && new Date(user.locked_until) > new Date();
}

async function registerFailedAttempt(user) {
  const attempts = user.failed_login_attempts + 1;
  let lockedUntil = null;
  if (attempts >= env.MAX_FAILED_LOGIN_ATTEMPTS) {
    lockedUntil = new Date(Date.now() + env.LOCKOUT_DURATION_MINUTES * 60 * 1000);
  }
  await pool.query(
    `UPDATE users SET failed_login_attempts = $1, locked_until = $2, updated_at = now() WHERE id = $3`,
    [attempts, lockedUntil, user.id]
  );
  return { attempts, lockedUntil };
}

async function resetFailedAttempts(userId) {
  await pool.query(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = now(), updated_at = now() WHERE id = $1`,
    [userId]
  );
}

// Step 1 of login: verify email + password (+ account status/lockout).
// Returns a discriminated result so the controller can decide whether to
// ask for an MFA code next, without ever telling the client whether it was
// the email or the password that was wrong (mitigates user enumeration).
async function verifyCredentials(email, password) {
  const user = await findUserByEmail(email);
  const genericError = () => {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    return err;
  };

  if (!user) throw genericError();
  if (user.status !== 'active') {
    const err = new Error('This account is not active. Contact an administrator.');
    err.statusCode = 403;
    throw err;
  }
  if (isCurrentlyLocked(user)) {
    const err = new Error('This account is temporarily locked due to repeated failed logins. Try again later.');
    err.statusCode = 423;
    throw err;
  }

  const passwordOk = await verifyPassword(password, user.password_hash);
  if (!passwordOk) {
    await registerFailedAttempt(user);
    throw genericError();
  }

  return user;
}

async function verifyMfaCode(user, code) {
  if (!user.mfa_enabled) return true; // MFA not enabled for this account
  return verifyTotpToken(user.mfa_secret, code);
}

// Issues the access + refresh token pair, persists the refresh token
// (hashed) so it can later be revoked/rotated, and resets the failed-login
// counter now that authentication has fully succeeded.
async function issueSession(user) {
  await resetFailedAttempts(user.id);

  const accessToken = signAccessToken(user);
  const { token: refreshToken, jti } = signRefreshToken(user);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days, matches JWT_REFRESH_EXPIRY default

  await pool.query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
    [jti, user.id, hashToken(refreshToken), expiresAt]
  );

  return { accessToken, refreshToken };
}

async function rotateRefreshToken(oldRefreshToken) {
  const payload = verifyRefreshToken(oldRefreshToken); // throws if invalid/expired
  const { rows } = await pool.query(
    `SELECT * FROM refresh_tokens WHERE id = $1 AND user_id = $2`,
    [payload.jti, payload.sub]
  );
  const stored = rows[0];
  if (!stored || stored.revoked || stored.token_hash !== hashToken(oldRefreshToken)) {
    const err = new Error('Session is no longer valid. Please log in again.');
    err.statusCode = 401;
    throw err;
  }
  if (new Date(stored.expires_at) < new Date()) {
    const err = new Error('Session expired. Please log in again.');
    err.statusCode = 401;
    throw err;
  }

  // Revoke the old refresh token (rotation) before issuing a new pair — if
  // a stolen refresh token is ever replayed after the legitimate client has
  // already rotated it, this detects and blocks the reuse.
  await pool.query(`UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`, [stored.id]);

  const user = await findUserById(payload.sub);
  if (!user || user.status !== 'active') {
    const err = new Error('Account is no longer active.');
    err.statusCode = 403;
    throw err;
  }
  return issueSession(user);
}

async function revokeAllSessions(userId) {
  await pool.query(`UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`, [userId]);
}

module.exports = {
  findUserByEmail,
  findUserById,
  registerEmployee,
  verifyCredentials,
  verifyMfaCode,
  issueSession,
  rotateRefreshToken,
  revokeAllSessions,
};
