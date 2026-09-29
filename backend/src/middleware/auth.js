/**
 * auth.js  (authentication middleware)
 * ----------------------------------------------------------------------------
 * Verifies the JWT access token on every protected request and attaches the
 * decoded identity to `req.user`. This is the single enforcement point that
 * every protected route passes through — role checks happen afterwards in
 * rbac.js, but NO route downstream of this middleware ever needs to
 * re-parse or re-trust a token itself.
 *
 * SECURE CODING NOTE: role/permission enforcement happens here, on the
 * SERVER, not just by hiding buttons in the React UI. Proposal Section 8/10
 * is explicit that RBAC must be "enforced on both frontend routes and
 * backend endpoints" and that there must be "no client-side-only permission
 * checks." Hiding an admin button in the UI is a UX nicety; this middleware
 * is the actual security boundary.
 * ----------------------------------------------------------------------------
 */
const { verifyAccessToken } = require('../utils/jwt');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const payload = verifyAccessToken(token);

    // A user who has been suspended/locked AFTER their token was issued
    // must not keep working just because the token hasn't expired yet.
    // (The token's `status` claim is a snapshot from login time, so we
    // still re-check current DB status on sensitive write operations inside
    // each module — this is a fast first-pass filter, not the only check.)
    if (payload.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended.' });
    }

    req.user = { id: payload.sub, role: payload.role, status: payload.status };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

module.exports = { requireAuth };
