/**
 * validate.js
 * ----------------------------------------------------------------------------
 * Wraps express-validator's result check into one reusable middleware.
 * Every route that accepts a request body imports a validation chain from
 * its own module and finishes with this `runValidation` middleware —
 * enforcing Proposal Section 10's "Server-side validation of all inputs"
 * for EVERY write path, not just the ones that look dangerous.
 * ----------------------------------------------------------------------------
 */
const { validationResult } = require('express-validator');

function runValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid input.', details: errors.array() });
  }
  next();
}

module.exports = { runValidation };
