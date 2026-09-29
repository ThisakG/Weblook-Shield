const { body, query } = require('express-validator');

const createRequestValidators = [
  body('assetType').trim().isLength({ min: 2, max: 60 }),
  body('justification').optional().trim().isLength({ max: 500 }),
];
const resolveValidators = [
  body('status').isIn(['approved', 'rejected', 'fulfilled']),
  body('assetId').optional().isUUID(),
];
const listRequestsValidators = [query('status').optional().isIn(['pending', 'approved', 'rejected', 'fulfilled'])];
const createAssetValidators = [
  body('assetTag').trim().isLength({ min: 2, max: 40 }),
  body('assetType').trim().isLength({ min: 2, max: 60 }),
  body('description').optional().trim().isLength({ max: 300 }),
];

module.exports = { createRequestValidators, resolveValidators, listRequestsValidators, createAssetValidators };
