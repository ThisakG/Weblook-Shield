/**
 * auth.routes.js
 * ----------------------------------------------------------------------------
 * Route wiring for /api/auth/*. Each route explicitly lists its middleware
 * chain so the security posture of every endpoint is visible at a glance:
 * rate limiting -> validation -> (auth) -> controller.
 * ----------------------------------------------------------------------------
 */
const express = require('express');
const controller = require('./auth.controller');
const validators = require('./auth.validators');
const { runValidation } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { loginLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

router.post('/register', validators.registerValidators, runValidation, controller.register);
router.post('/login', loginLimiter, validators.loginValidators, runValidation, controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', requireAuth, controller.logout);
router.get('/me', requireAuth, controller.me);

// MFA enrolment — the user must already be authenticated with a valid
// password-based session before they can enrol a second factor.
router.post('/mfa/setup', requireAuth, controller.beginMfaSetup);
router.post('/mfa/confirm', requireAuth, controller.confirmMfaSetup);

// Password reset — deliberately unauthenticated endpoints (that's the point
// of self-service reset), protected instead by the time-limited token and
// the same login rate limiter to slow down abuse.
router.post('/password-reset/request', loginLimiter, validators.requestResetValidators, runValidation, controller.requestPasswordReset);
router.post('/password-reset/complete', loginLimiter, validators.completeResetValidators, runValidation, controller.completePasswordReset);

module.exports = router;
