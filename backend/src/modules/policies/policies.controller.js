/**
 * policies.controller.js
 * ----------------------------------------------------------------------------
 * HTTP layer for the policy library. Publishing and acknowledgement are
 * both explicitly named in the Auditability NFR ("policy publish,
 * acknowledgement" are both examples of events that must be logged), so
 * both actions here write an audit_log row.
 * ----------------------------------------------------------------------------
 */
const service = require('./policies.service');
const { recordAudit } = require('../../middleware/auditLogger');

async function list(req, res, next) {
  try {
    res.json({ policies: await service.listPolicies(req.query) });
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const policy = await service.getPolicyDetail(req.params.id, req.user.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found.' });
    res.json({ policy });
  } catch (err) { next(err); }
}

async function acknowledge(req, res, next) {
  try {
    const acknowledgedAt = await service.acknowledgePolicy(req.user.id, req.body.versionId);
    await recordAudit({
      actorId: req.user.id, action: 'POLICY_ACKNOWLEDGED', targetType: 'policy_version',
      targetId: req.body.versionId, ipAddress: req.ip,
    });
    res.json({ message: 'Acknowledgement recorded.', acknowledgedAt });
  } catch (err) { next(err); }
}

async function complianceStatus(req, res, next) {
  try {
    res.json({ status: await service.getComplianceStatusForUser(req.user.id) });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const policyId = await service.createPolicy({ ...req.body, publishedBy: req.user.id });
    await recordAudit({ actorId: req.user.id, action: 'POLICY_PUBLISHED', targetType: 'policy', targetId: policyId, details: { code: req.body.code, versionLabel: req.body.versionLabel || '1.0' }, ipAddress: req.ip });
    res.status(201).json({ message: 'Policy created and published.', policyId });
  } catch (err) { next(err); }
}

async function publishVersion(req, res, next) {
  try {
    const version = await service.publishNewVersion(req.params.id, { ...req.body, publishedBy: req.user.id });
    await recordAudit({ actorId: req.user.id, action: 'POLICY_PUBLISHED', targetType: 'policy', targetId: req.params.id, details: { versionLabel: version.version_label }, ipAddress: req.ip });
    res.json({ message: 'New version published.', version });
  } catch (err) { next(err); }
}

async function outstanding(req, res, next) {
  try {
    res.json({ outstanding: await service.listOutstandingAcknowledgements() });
  } catch (err) { next(err); }
}

module.exports = { list, getOne, acknowledge, complianceStatus, create, publishVersion, outstanding };
