/**
 * app.js
 * ----------------------------------------------------------------------------
 * Builds and configures the Express application: security headers, CORS,
 * body/cookie parsing, rate limiting, CSRF, route mounting, and the final
 * error handler. Kept separate from server.js so the app object can be
 * imported directly by tests without binding a real network port.
 * ----------------------------------------------------------------------------
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');
const { verifyCsrf } = require('./middleware/csrf');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const policiesRoutes = require('./modules/policies/policies.routes');
const trainingRoutes = require('./modules/training/training.routes');
const assetsRoutes = require('./modules/assets/assets.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');

const app = express();

// Trust the first proxy hop (needed when deployed behind a reverse proxy /
// PaaS load balancer, e.g. Render/Railway/Nginx) so req.ip and the
// rate-limiter see the real client IP rather than the proxy's IP.
app.set('trust proxy', 1);

// ---------------------------------------------------------------------------
// SECURITY HEADERS — helmet() sets a strong baseline (X-Content-Type-Options,
// X-Frame-Options, etc). We then override the Content-Security-Policy
// explicitly per Proposal Section 10: "Output encoding and a strict Content
// Security Policy to mitigate cross-site scripting (XSS)."
// ---------------------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // 'unsafe-inline' only for styles, needed by the built React CSS
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"], // clickjacking defence, stronger than X-Frame-Options alone
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
}));

// CORS: only the configured frontend origin may call this API, and
// credentials (cookies) are allowed only for that origin — never '*' when
// credentials are involved, or the browser would refuse to send cookies
// anyway and any wildcard would be a meaningless, false sense of security.
app.use(cors({
  origin: env.CORS_ORIGIN.split(','),
  credentials: true,
}));

app.use(express.json({ limit: '1mb' })); // limit protects against oversized-payload DoS
app.use(cookieParser());
app.use(apiLimiter);
app.use(verifyCsrf);

// Health check for container orchestration / uptime monitoring (Availability NFR).
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/policies', policiesRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 fallback for any unmatched API route.
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// MUST be the last app.use() — Express identifies error-handling middleware
// by its 4-argument signature.
app.use(errorHandler);

module.exports = app;
