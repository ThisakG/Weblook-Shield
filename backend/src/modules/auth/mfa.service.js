/**
 * mfa.service.js
 * ----------------------------------------------------------------------------
 * Handles MFA enrolment: generating a TOTP secret + QR code, and confirming
 * enrolment once the user proves they can generate a valid code (so we
 * never mark MFA "enabled" based on a secret the user hasn't actually
 * loaded into their authenticator app yet).
 * ----------------------------------------------------------------------------
 */
const { pool } = require('../../config/db');
const { generateMfaSecret, generateQrCodeDataUrl, verifyTotpToken } = require('../../utils/totp');

async function beginMfaEnrolment(user) {
  const secret = generateMfaSecret(user.email);
  // The secret is stored immediately but mfa_enabled stays FALSE until the
  // user confirms with a valid code — see confirmMfaEnrolment below.
  await pool.query(`UPDATE users SET mfa_secret = $1, updated_at = now() WHERE id = $2`, [secret.base32, user.id]);
  const qrCodeDataUrl = await generateQrCodeDataUrl(secret.otpauth_url);
  return { qrCodeDataUrl, base32Secret: secret.base32 };
}

async function confirmMfaEnrolment(user, code) {
  const ok = verifyTotpToken(user.mfa_secret, code);
  if (!ok) {
    const err = new Error('Incorrect verification code. Please try again.');
    err.statusCode = 400;
    throw err;
  }
  await pool.query(`UPDATE users SET mfa_enabled = TRUE, updated_at = now() WHERE id = $1`, [user.id]);
  return true;
}

// Administrator-triggered MFA disable, for verified account-recovery
// scenarios only (WSP-04 §3.2) — logged to the audit trail by the caller.
async function disableMfaForUser(userId) {
  await pool.query(`UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL, updated_at = now() WHERE id = $1`, [userId]);
}

module.exports = { beginMfaEnrolment, confirmMfaEnrolment, disableMfaForUser };
