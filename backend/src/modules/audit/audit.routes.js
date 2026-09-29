/**
 * audit.routes.js
 * ----------------------------------------------------------------------------
 * The entire audit trail is READ-ONLY for both administrators AND the
 * system owner (system_owner needs "relevant system records for governance
 * and oversight" per Proposal Section 7) — there is no route here that
 * mutates audit_log, by design.
 * ----------------------------------------------------------------------------
 */
const express = require('express');
const controller = require('./audit.controller');
const { requireAuth } = require('../../middleware/auth');
const { requireRole, READ_ONLY_ROLES } = require('../../middleware/rbac');

const router = express.Router();
router.use(requireAuth, requireRole(...READ_ONLY_ROLES));

router.get('/', controller.list);
router.get('/export.csv', controller.exportCsv);
router.get('/kpi/failed-logins', controller.failedLoginKpi);
router.get('/kpi/activity-summary', controller.activitySummary);

module.exports = router;
