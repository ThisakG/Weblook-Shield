const express = require('express');
const controller = require('./training.controller');
const validators = require('./training.validators');
const { runValidation } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { requireRole, READ_ONLY_ROLES } = require('../../middleware/rbac');

const router = express.Router();
router.use(requireAuth);

router.get('/', controller.list);
router.get('/incomplete', requireRole(...READ_ONLY_ROLES), controller.incomplete);
router.get('/analytics/completion-rate', requireRole(...READ_ONLY_ROLES), controller.completionRate);
router.get('/:id', validators.moduleIdParam, runValidation, controller.getOne);
router.post('/:id/submit', validators.submitQuizValidators, runValidation, controller.submit);

module.exports = router;
