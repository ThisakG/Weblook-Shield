/**
 * password-reset.service.js
 * ----------------------------------------------------------------------------
 * Self-service, "secure, time-limited email token" password reset flow
 * (Proposal Section 8).
 *
 * DEMO NOTE: This project does not wire up a real SMTP provider (out of
 * scope for a student pilot deployment and not listed in the tech stack).
 * Instead the generated reset link is LOGGED server-side (and returned in
 * the API response only when NODE_ENV=development) so the flow can be
 * demonstrated end-to-end without a mail server. Wiring in a provider such
 * as SendGrid/SES later only requires changing the `deliverResetLink`
 * function below — nothing else in the flow would need to change.
 * ----------------------------------------------------------------------------
 */
const crypto = require('crypto');
const { pool } = require('../../config/db');
const { hashToken } = require('../../utils/jwt');
const { hashPassword } = require('../../utils/password');
const logger = require('../../utils/logger');

const RESET_TOKEN_TTL_MINUTES = 30;

function deliverResetLink(email, rawToken) {
  const link = `http://localhost:5173/reset-password?token=${rawToken}`;
  // In production this would call an email provider. For the demo we log
  // it, which is sufficient to demonstrate the full flow locally.
  logger.info(`[DEMO EMAIL] Password reset link for ${email}: ${link}`);
  return link;
}

async function requestPasswordReset(email) {
  const { rows } = await pool.query(`SELECT id, email FROM users WHERE email = $1`, [email.toLowerCase()]);
  const user = rows[0];
  // Always behave the same way whether or not the account exists, so the
  // endpoint cannot be used to enumerate valid registered emails.
  if (!user) return { link: null };

  const rawToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, hashToken(rawToken), expiresAt]
  );

  const link = deliverResetLink(user.email, rawToken);
  return { link }; // link is only surfaced to the HTTP layer in dev mode
}

async function completePasswordReset(rawToken, newPassword) {
  const tokenHash = hashToken(rawToken);
  const { rows } = await pool.query(
    `SELECT * FROM password_reset_tokens WHERE token_hash = $1 AND used = FALSE AND expires_at > now()`,
    [tokenHash]
  );
  const tokenRow = rows[0];
  if (!tokenRow) {
    const err = new Error('This reset link is invalid or has expired.');
    err.statusCode = 400;
    throw err;
  }

  const passwordHash = await hashPassword(newPassword);
  await pool.query(`UPDATE users SET password_hash = $1, must_reset_password = FALSE, updated_at = now() WHERE id = $2`, [passwordHash, tokenRow.user_id]);
  await pool.query(`UPDATE password_reset_tokens SET used = TRUE WHERE id = $1`, [tokenRow.id]);

  return tokenRow.user_id;
}

module.exports = { requestPasswordReset, completePasswordReset };
