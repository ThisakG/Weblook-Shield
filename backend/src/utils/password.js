/**
 * password.js
 * ----------------------------------------------------------------------------
 * Thin wrapper around bcrypt so password hashing/verification logic lives
 * in exactly one place (WSP-04 / NFR-Security: "passwords hashed with
 * bcrypt/argon2 ... never stored in plaintext").
 * ----------------------------------------------------------------------------
 */
const bcrypt = require('bcrypt');
const env = require('../config/env');

async function hashPassword(plainTextPassword) {
  return bcrypt.hash(plainTextPassword, env.BCRYPT_ROUNDS);
}

async function verifyPassword(plainTextPassword, hash) {
  return bcrypt.compare(plainTextPassword, hash);
}

// Enforces the WSP-04 minimum password requirement (>= 14 characters) at
// the application layer, in addition to whatever the frontend form does —
// server-side validation must never be optional, since a client-side-only
// check can always be bypassed by calling the API directly.
function isPasswordStrongEnough(plainTextPassword) {
  if (typeof plainTextPassword !== 'string') return false;
  if (plainTextPassword.length < 14) return false;
  // Require at least one letter and one number/symbol so "aaaaaaaaaaaaaa"
  // (14 a's) does not pass purely on length.
  const hasLetter = /[a-zA-Z]/.test(plainTextPassword);
  const hasOther = /[0-9\W]/.test(plainTextPassword);
  return hasLetter && hasOther;
}

module.exports = { hashPassword, verifyPassword, isPasswordStrongEnough };
