/**
 * rateLimiter.js
 * ----------------------------------------------------------------------------
 * Two rate limiters:
 *   1. `loginLimiter`  — tight limit on the /auth/login endpoint specifically,
 *      addressing Proposal Section 10: "Rate limiting and account lockout to
 *      reduce brute-force login risk."
 *   2. `apiLimiter` — a generous, general-purpose limit on the whole API so
 *      no single client can exhaust server resources (Availability NFR).
 * ----------------------------------------------------------------------------
 */
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 attempts per IP per window, independent of the per-account
           // lockout enforced in auth.service.js — this stops an attacker
           // from spraying many different usernames from one IP.
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts from this network. Please try again later.' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

module.exports = { loginLimiter, apiLimiter };
