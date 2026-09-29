/**
 * errorHandler.js
 * ----------------------------------------------------------------------------
 * Centralised Express error handler.
 *
 * WHY: Availability NFR — "graceful error handling rather than raw stack
 * traces." Without this, an uncaught exception in any route would leak
 * internal stack traces (file paths, library versions, query text) to the
 * client, which is itself an information-disclosure risk. Every route in
 * this codebase either handles its own errors or lets them bubble up to
 * this single handler, which always returns a clean, generic message to
 * the client while still logging full detail server-side for debugging.
 * ----------------------------------------------------------------------------
 */
const logger = require('../utils/logger');
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.path} ->`, err);

  const status = err.statusCode || 500;
  const responseBody = {
    error: status === 500 ? 'Something went wrong. Please try again later.' : err.message,
  };

  // Only include the stack trace when explicitly running in development, and
  // never in a response that would reach a real user in production.
  if (env.NODE_ENV === 'development' && status === 500) {
    responseBody.stack = err.stack;
  }

  res.status(status).json(responseBody);
}

module.exports = { errorHandler };
