/**
 * csrf.js
 * ----------------------------------------------------------------------------
 * CSRF protection using the double-submit cookie pattern, addressing
 * Proposal Section 10: "CSRF protection on state-changing requests; secure,
 * HttpOnly, SameSite cookies where cookies are used."
 *
 * HOW IT WORKS:
 *   1. On login, the server sets a `csrfToken` cookie (readable by JS,
 *      NOT HttpOnly, because the frontend must read it to echo it back).
 *   2. The refresh token itself is stored in a separate, HttpOnly,
 *      SameSite=Strict cookie so JavaScript can never read it (mitigating
 *      token theft via XSS).
 *   3. For every state-changing request (POST/PUT/PATCH/DELETE), the
 *      frontend sends the csrfToken value back in an `X-CSRF-Token` header.
 *      This middleware checks the header matches the cookie.
 *   A cross-site attacker can trick a browser into *sending* cookies, but
 *   cannot read the csrfToken cookie's value (same-origin policy) to also
 *   set the matching header — so a forged cross-site request fails here.
 * ----------------------------------------------------------------------------
 */
function verifyCsrf(req, res, next) {
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!isStateChanging) return next();

  // Exempt the login/register endpoints themselves — there is no session
  // yet for CSRF to protect, and requiring a CSRF token before a session
  // exists would create a chicken-and-egg problem.
  const exemptPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];
  if (exemptPaths.includes(req.path)) return next();

  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'CSRF validation failed. Please refresh the page and try again.' });
  }
  next();
}

module.exports = { verifyCsrf };
