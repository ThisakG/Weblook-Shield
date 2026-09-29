/**
 * totp.js
 * ----------------------------------------------------------------------------
 * Time-based One-Time Passcode (TOTP) helpers for Multi-Factor
 * Authentication, using the `speakeasy` library named explicitly in the
 * proposal's technology stack (Section 12).
 * ----------------------------------------------------------------------------
 */
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

// Generates a new base32 TOTP secret plus an otpauth:// URL that can be
// turned into a QR code for the user to scan with Google Authenticator
// (explicitly referenced in the training content and WSP-04).
function generateMfaSecret(userEmail) {
  const secret = speakeasy.generateSecret({
    name: `Weblook Shield (${userEmail})`,
    length: 20,
  });
  return secret; // { base32, otpauth_url, ... }
}

async function generateQrCodeDataUrl(otpauthUrl) {
  return qrcode.toDataURL(otpauthUrl);
}

// window: 1 allows the code from one step before/after the current 30s
// window, tolerating minor clock drift between server and phone.
function verifyTotpToken(base32Secret, token) {
  return speakeasy.totp.verify({
    secret: base32Secret,
    encoding: 'base32',
    token,
    window: 1,
  });
}

module.exports = { generateMfaSecret, generateQrCodeDataUrl, verifyTotpToken };
