const express = require('express');
const controller = require('./assets.controller');
const validators = require('./assets.validators');
const { runValidation } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { requireRole, READ_ONLY_ROLES } = require('../../middleware/rbac');

const router = express.Router();
router.use(requireAuth);

router.get('/inventory', controller.inventory); // every role may view the inventory (it's linked from the AUP, which everyone reads)
router.get('/mine', controller.myAssets);
router.post('/requests', validators.createRequestValidators, runValidation, controller.createRequest);
router.get('/requests/mine', controller.myRequests);

router.get('/requests', requireRole(...READ_ONLY_ROLES), validators.listRequestsValidators, runValidation, controller.allRequests);
router.patch('/requests/:id', requireRole('administrator'), validators.resolveValidators, runValidation, controller.resolve);
router.post('/inventory', requireRole('administrator'), validators.createAssetValidators, runValidation, controller.createAsset);

module.exports = router;
