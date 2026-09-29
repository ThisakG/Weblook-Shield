/**
 * rbac.js  (Role-Based Access Control engine)
 * ----------------------------------------------------------------------------
 * Maps the three roles from Proposal Section 7 to route-level permissions.
 * Usage: router.get('/admin/users', requireAuth, requireRole('administrator'), handler)
 *
 * WHY a small allow-list function rather than a permissions matrix library:
 *   The proposal's role model is intentionally simple (3 roles), so a
 *   readable, explicit `requireRole(...)` reads clearly in every route file
 *   and is trivial for four different contributors to audit at a glance.
 * ----------------------------------------------------------------------------
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      // Defensive check: requireRole should always run after requireAuth,
      // but fail closed if that ordering is ever violated by mistake.
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

// Convenience export: System Owner is explicitly READ-ONLY per Proposal
// Section 7 ("Read-only access ... for governance and oversight purposes").
// Any route that mutates data must NOT include 'system_owner' here, even
// though system owners can view almost everything an admin can view.
const READ_ONLY_ROLES = ['administrator', 'system_owner'];

module.exports = { requireRole, READ_ONLY_ROLES };
