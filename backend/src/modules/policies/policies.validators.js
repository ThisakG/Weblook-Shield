const { body, query } = require('express-validator');

const listValidators = [query('search').optional().trim().isLength({ max: 120 })];

const createValidators = [
  body('code').trim().isLength({ min: 2, max: 20 }),
  body('title').trim().isLength({ min: 2, max: 160 }),
  body('category').trim().isLength({ min: 2, max: 80 }),
  body('owner').trim().isLength({ min: 2, max: 120 }),
  body('isDevicePolicy').optional().isBoolean(),
  body('content').trim().isLength({ min: 10 }),
  body('versionLabel').optional().trim().isLength({ max: 20 }),
];

const publishVersionValidators = [
  body('versionLabel').trim().isLength({ min: 1, max: 20 }),
  body('content').trim().isLength({ min: 10 }),
];

const acknowledgeValidators = [body('versionId').isUUID()];

module.exports = { listValidators, createValidators, publishVersionValidators, acknowledgeValidators };
