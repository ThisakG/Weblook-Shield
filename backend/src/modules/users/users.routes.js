/**
 * users.routes.js
 * ----------------------------------------------------------------------------
 * Every route here requires 'administrator' specifically (NOT system_owner,
 * who is read-only per Proposal Section 7) except the two read-only GETs,
 * which system_owner may also access for oversight.
 * ----------------------------------------------------------------------------
 */
const express = require('express');
const controller = require('./users.controller');
const validators = require('./users.validators');
const { runValidation } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { requireRole, READ_ONLY_ROLES } = require('../../middleware/rbac');

const router = express.Router();
router.use(requireAuth);

router.get('/', requireRole(...READ_ONLY_ROLES), validators.listUsersValidators, runValidation, controller.list);
router.get('/:id', requireRole(...READ_ONLY_ROLES), controller.getOne);

// Everything below mutates state -> administrator ONLY, never system_owner.
router.post('/', requireRole('administrator'), validators.createUserValidators, runValidation, controller.create);
router.patch('/:id/status', requireRole('administrator'), validators.changeStatusValidators, runValidation, controller.changeStatus);
router.patch('/:id/role', requireRole('administrator'), validators.changeRoleValidators, runValidation, controller.changeRole);
router.post('/:id/force-password-reset', requireRole('administrator'), controller.forceReset);
router.post('/:id/disable-mfa', requireRole('administrator'), controller.disableMfa);
router.delete('/:id', requireRole('administrator'), controller.remove);

module.exports = router;
