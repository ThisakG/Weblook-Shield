/**
 * server.js
 * ----------------------------------------------------------------------------
 * Process entrypoint: binds the configured Express app to a TCP port.
 * Kept intentionally tiny — all actual application wiring lives in app.js.
 * ----------------------------------------------------------------------------
 */
const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');

app.listen(env.PORT, () => {
  logger.info(`Weblook Shield API listening on port ${env.PORT} (${env.NODE_ENV})`);
});
