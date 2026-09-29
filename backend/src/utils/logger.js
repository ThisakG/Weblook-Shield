/**
 * logger.js
 * ----------------------------------------------------------------------------
 * Minimal structured logger. A real production deployment might swap this
 * for pino/winston, but the interface (info/warn/error) is kept identical
 * so that swap would touch only this one file.
 * ----------------------------------------------------------------------------
 */
function timestamp() {
  return new Date().toISOString();
}

module.exports = {
  info: (...args) => console.log(`[${timestamp()}] INFO`, ...args),
  warn: (...args) => console.warn(`[${timestamp()}] WARN`, ...args),
  error: (...args) => console.error(`[${timestamp()}] ERROR`, ...args),
};
