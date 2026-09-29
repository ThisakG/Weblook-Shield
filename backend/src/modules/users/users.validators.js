const { body, query } = require('express-validator');

const listUsersValidators = [
  query('search').optional().trim().isLength({ max: 120 }),
  query('role').optional().isIn(['employee', 'administrator', 'system_owner']),
  query('status').optional().isIn(['active', 'locked', 'suspended']),
];

const createUserValidators = [
  body('fullName').trim().isLength({ min: 2, max: 120 }),
  body('email').trim().isEmail().normalizeEmail(),
  body('department').optional().trim().isLength({ max: 80 }),
  body('role').isIn(['employee', 'administrator', 'system_owner']),
];

const changeStatusValidators = [body('status').isIn(['active', 'locked', 'suspended'])];
const changeRoleValidators = [
  body('role').isIn(['employee', 'administrator', 'system_owner']),
  // Requires the admin to explicitly acknowledge escalation — the frontend
  // shows a confirmation dialog and only then sends confirm: true, matching
  // Proposal Section 8: "confirmation step for privilege escalation."
  body('confirm').equals('true'),
];

module.exports = { listUsersValidators, createUserValidators, changeStatusValidators, changeRoleValidators };
