const express = require('express');
const controller = require('./policies.controller');
const validators = require('./policies.validators');
const { runValidation } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { requireRole, READ_ONLY_ROLES } = require('../../middleware/rbac');

const router = express.Router();
router.use(requireAuth); // every policy route requires a logged-in session (all roles can read policies)

router.get('/', validators.listValidators, runValidation, controller.list);
router.get('/compliance/me', controller.complianceStatus);
router.get('/outstanding', requireRole(...READ_ONLY_ROLES), controller.outstanding);
router.get('/:id', controller.getOne);

router.post('/:id/acknowledge', validators.acknowledgeValidators, runValidation, controller.acknowledge);

// Publishing/creating policies is an administrator-only write action.
router.post('/', requireRole('administrator'), validators.createValidators, runValidation, controller.create);
router.post('/:id/versions', requireRole('administrator'), validators.publishVersionValidators, runValidation, controller.publishVersion);

module.exports = router;
