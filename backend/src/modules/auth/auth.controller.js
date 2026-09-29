/**
 * auth.controller.js
 * ----------------------------------------------------------------------------
 * HTTP layer for authentication: translates requests into calls on
 * auth.service.js / mfa.service.js / password-reset.service.js, sets/clears
 * cookies, and records audit log entries for every security-relevant event
 * (login success/failure, logout, password reset, MFA changes) per the
 * Auditability NFR.
 * ----------------------------------------------------------------------------
 */
const crypto = require('crypto');
const authService = require('./auth.service');
const mfaService = require('./mfa.service');
const resetService = require('./password-reset.service');
const { recordAudit } = require('../../middleware/auditLogger');
const env = require('../../config/env');

// Cookie options shared by the refresh-token and CSRF cookies. `secure`
// should be true in production (HTTPS only) — see docker-compose /
// hosting guide for how TLS termination is configured at the proxy layer.
const REFRESH_COOKIE_OPTS = {
  httpOnly: true, // JavaScript can NEVER read this cookie — mitigates XSS token theft
  sameSite: 'strict', // never sent on cross-site requests — core CSRF defence
  secure: env.NODE_ENV === 'production',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const CSRF_COOKIE_OPTS = {
  httpOnly: false, // the frontend must be able to read this one to echo it back in a header
  sameSite: 'strict',
  secure: env.NODE_ENV === 'production',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function issueCsrfCookie(res) {
  const csrfToken = crypto.randomBytes(24).toString('hex');
  res.cookie('csrfToken', csrfToken, CSRF_COOKIE_OPTS);
}

async function register(req, res, next) {
  try {
    const user = await authService.registerEmployee(req.body);
    await recordAudit({ actorId: user.id, actorEmail: user.email, action: 'USER_REGISTERED', targetType: 'user', targetId: user.id, ipAddress: req.ip });
    res.status(201).json({ message: 'Account created. You can now log in.', user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  const { email, password, mfaCode } = req.body;
  try {
    const user = await authService.verifyCredentials(email, password);

    if (user.mfa_enabled) {
      if (!mfaCode) {
        // Tell the client an MFA code is required without issuing any
        // session yet — the password alone is never sufficient for an
        // MFA-enabled account.
        return res.status(206).json({ mfaRequired: true, message: 'Enter your authenticator code to continue.' });
      }
      const mfaOk = await authService.verifyMfaCode(user, mfaCode);
      if (!mfaOk) {
        await recordAudit({ actorId: user.id, actorEmail: user.email, action: 'LOGIN_FAILED_MFA', ipAddress: req.ip });
        return res.status(401).json({ error: 'Incorrect authentication code.' });
      }
    }

    const { accessToken, refreshToken } = await authService.issueSession(user);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);
    issueCsrfCookie(res);

    await recordAudit({ actorId: user.id, actorEmail: user.email, action: 'LOGIN_SUCCESS', ipAddress: req.ip });

    res.json({
      accessToken,
      user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role, department: user.department, mfaEnabled: user.mfa_enabled },
    });
  } catch (err) {
    if (err.statusCode === 401) {
      await recordAudit({ actorEmail: email, action: 'LOGIN_FAILED', details: { reason: err.message }, ipAddress: req.ip });
    }
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const oldToken = req.cookies?.refreshToken;
    if (!oldToken) return res.status(401).json({ error: 'No active session.' });

    const { accessToken, refreshToken } = await authService.rotateRefreshToken(oldToken);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);
    issueCsrfCookie(res);
    res.json({ accessToken });
  } catch (err) {
    res.clearCookie('refreshToken', { path: '/api/auth' });
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    if (req.user) {
      await authService.revokeAllSessions(req.user.id);
      await recordAudit({ actorId: req.user.id, action: 'LOGOUT', ipAddress: req.ip });
    }
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.clearCookie('csrfToken', { path: '/' });
    res.json({ message: 'Logged out.' });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({
      id: user.id, fullName: user.full_name, email: user.email, role: user.role,
      department: user.department, mfaEnabled: user.mfa_enabled, status: user.status,
    });
  } catch (err) {
    next(err);
  }
}

async function beginMfaSetup(req, res, next) {
  try {
    const user = await authService.findUserById(req.user.id);
    const { qrCodeDataUrl } = await mfaService.beginMfaEnrolment(user);
    res.json({ qrCodeDataUrl });
  } catch (err) {
    next(err);
  }
}

async function confirmMfaSetup(req, res, next) {
  try {
    const user = await authService.findUserById(req.user.id);
    await mfaService.confirmMfaEnrolment(user, req.body.code);
    await recordAudit({ actorId: user.id, actorEmail: user.email, action: 'MFA_ENABLED', ipAddress: req.ip });
    res.json({ message: 'MFA enabled successfully.' });
  } catch (err) {
    next(err);
  }
}

async function requestPasswordReset(req, res, next) {
  try {
    const result = await resetService.requestPasswordReset(req.body.email);
    await recordAudit({ actorEmail: req.body.email, action: 'PASSWORD_RESET_REQUESTED', ipAddress: req.ip });
    const payload = { message: 'If that email is registered, a reset link has been sent.' };
    // Only ever expose the raw link in development, to allow local demoing
    // without a real mail server. Never expose it in production.
    if (env.NODE_ENV === 'development') payload.devResetLink = result.link;
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

async function completePasswordReset(req, res, next) {
  try {
    const userId = await resetService.completePasswordReset(req.body.token, req.body.newPassword);
    await authService.revokeAllSessions(userId); // force re-login everywhere after a reset
    await recordAudit({ actorId: userId, action: 'PASSWORD_RESET_COMPLETED', ipAddress: req.ip });
    res.json({ message: 'Password updated. Please log in with your new password.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, me, beginMfaSetup, confirmMfaSetup, requestPasswordReset, completePasswordReset };
