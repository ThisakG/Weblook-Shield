/**
 * jwt.js
 * ----------------------------------------------------------------------------
 * Issues and verifies short-lived ACCESS tokens and longer-lived REFRESH
 * tokens, matching Proposal Section 8: "JSON Web Token (JWT) based session
 * management with short-lived access tokens and refresh tokens."
 *
 * Design notes:
 *   - Access tokens carry only what the RBAC middleware needs (user id,
 *     role, status) — never the password hash or MFA secret.
 *   - Refresh tokens are stored HASHED in the `refresh_tokens` table
 *     (see modules/auth/auth.service.js) so a database compromise alone
 *     cannot be used to mint new sessions; the raw token is only ever seen
 *     by the legitimate client.
 *   - Two different signing secrets are used for access vs refresh tokens
 *     so that leaking one token type cannot be used to forge the other.
 * ----------------------------------------------------------------------------
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, status: user.status },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRY }
  );
}

function signRefreshToken(user) {
  // jti (JWT ID) lets us correlate this token to its hashed DB row without
  // needing to store the full token value.
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { sub: user.id, jti },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRY }
  );
  return { token, jti };
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

// Refresh tokens are hashed with SHA-256 before being stored — fast and
// sufficient here because, unlike passwords, refresh tokens are already
// high-entropy random JWTs, not human-chosen secrets that need bcrypt's
// deliberate slowness.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, hashToken };
