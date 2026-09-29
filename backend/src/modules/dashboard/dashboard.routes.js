const express = require('express');
const controller = require('./dashboard.controller');
const { requireAuth } = require('../../middleware/auth');
const { requireRole, READ_ONLY_ROLES } = require('../../middleware/rbac');

const router = express.Router();
// Both administrator and system_owner may view the overview dashboard;
// system_owner's access remains read-only because this route only ever
// SELECTs data (see dashboard.service.js) — never mutates it.
router.get('/overview', requireAuth, requireRole(...READ_ONLY_ROLES), controller.overview);

module.exports = router;
