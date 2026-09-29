/**
 * users.controller.js
 * ----------------------------------------------------------------------------
 * HTTP layer for admin user management. Every mutating action here writes
 * an audit_log entry naming the acting administrator and the target user,
 * satisfying "Full change history per user account, viewable from the
 * user's profile page" (Proposal Section 8) and the Auditability NFR.
 * ----------------------------------------------------------------------------
 */
const service = require('./users.service');
const { recordAudit } = require('../../middleware/auditLogger');

async function list(req, res, next) {
  try {
    const users = await service.listUsers(req.query);
    res.json({ users });
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const user = await service.getUserProfile(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const history = await service.getUserHistory(req.params.id);
    res.json({ user, history });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { user, tempPassword } = await service.createUser(req.body);
    await recordAudit({ actorId: req.user.id, action: 'USER_CREATED', targetType: 'user', targetId: user.id, details: { email: user.email, role: req.body.role }, ipAddress: req.ip });
    // tempPassword is returned once, over the already-authenticated admin
    // session, for the admin to communicate to the new employee out-of-band.
    res.status(201).json({ user, tempPassword });
  } catch (err) { next(err); }
}

async function changeStatus(req, res, next) {
  try {
    const updated = await service.changeUserStatus(req.params.id, req.body.status);
    if (!updated) return res.status(404).json({ error: 'User not found.' });
    await recordAudit({ actorId: req.user.id, action: 'USER_STATUS_CHANGED', targetType: 'user', targetId: req.params.id, details: { newStatus: req.body.status }, ipAddress: req.ip });
    res.json({ user: updated });
  } catch (err) { next(err); }
}

async function changeRole(req, res, next) {
  try {
    const updated = await service.changeUserRole(req.params.id, req.body.role);
    if (!updated) return res.status(404).json({ error: 'User not found.' });
    // ROLE_CHANGED is one of the events explicitly called out by the
    // Auditability NFR: "Every security-relevant action (login, role
    // change, policy publish, acknowledgement) is logged..."
    await recordAudit({ actorId: req.user.id, action: 'ROLE_CHANGED', targetType: 'user', targetId: req.params.id, details: { newRole: req.body.role }, ipAddress: req.ip });
    res.json({ user: updated });
  } catch (err) { next(err); }
}

async function forceReset(req, res, next) {
  try {
    await service.forcePasswordReset(req.params.id);
    await recordAudit({ actorId: req.user.id, action: 'PASSWORD_RESET_FORCED', targetType: 'user', targetId: req.params.id, ipAddress: req.ip });
    res.json({ message: 'User will be required to reset their password at next login.' });
  } catch (err) { next(err); }
}

async function disableMfa(req, res, next) {
  try {
    await service.disableMfa(req.params.id);
    // MFA disable is a sensitive recovery action per WSP-04 §3.2 ("only for
    // verified account-recovery scenarios, with the action logged").
    await recordAudit({ actorId: req.user.id, action: 'MFA_DISABLED_BY_ADMIN', targetType: 'user', targetId: req.params.id, ipAddress: req.ip });
    res.json({ message: 'MFA has been disabled for this account.' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await service.deleteUser(req.params.id);
    await recordAudit({ actorId: req.user.id, action: 'USER_DELETED', targetType: 'user', targetId: req.params.id, ipAddress: req.ip });
    res.json({ message: 'User deleted.' });
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, changeStatus, changeRole, forceReset, disableMfa, remove };
