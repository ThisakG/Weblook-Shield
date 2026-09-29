# Architecture

## From the proposal's high-level feature diagram to this codebase

The proposal's Feature Overview (Section 6) groups the platform into four
functional pillars, which work together to form the final product. This
codebase implements each pillar as an isolated backend "module" (own
service/controller/routes/validators files) and a matching set of frontend
pages, following Proposal Section 11's "layered, service-oriented
architecture... Separating authentication, policy management, awareness
content, and monitoring into distinct backend services":

```
                        ┌─────────────────────────────┐
                        │        React SPA (Vite)      │
                        │  role-aware pages & routing   │
                        └───────────────┬───────────────┘
                                        │ REST (JWT bearer + CSRF header)
                        ┌───────────────▼───────────────┐
                        │      Express API Gateway       │
                        │  helmet / CORS / rate-limit /  │
                        │  CSRF / requireAuth / RBAC      │
                        └───┬─────┬─────┬─────┬─────┬────┘
             ┌──────────────┘     │     │     │     └───────────────┐
   ┌─────────▼───────┐ ┌──────────▼───┐ ┌▼─────────────┐ ┌──────────▼────┐ ┌───▼───────────┐
   │  auth module     │ │ users module │ │ policies mod  │ │ training mod  │ │ assets module │
   │ login/MFA/JWT/   │ │ RBAC user    │ │ library,      │ │ lessons,      │ │ inventory +   │
   │ password reset   │ │ management   │ │ versioning,   │ │ quizzes,      │ │ requests      │
   │                  │ │              │ │ acknowledge.  │ │ progress      │ │               │
   └──────────────────┘ └──────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
             │                                                                        │
             └───────────────────────────────┬────────────────────────────────────────┘
                                              │  every write path calls recordAudit()
                                    ┌─────────▼─────────┐
                                    │   audit module      │  (append-only, read-only API)
                                    │   + dashboard module │  (aggregated KPIs)
                                    └─────────┬───────────┘
                                              │
                                    ┌─────────▼─────────┐
                                    │     PostgreSQL      │
                                    └─────────────────────┘
```

Because each module owns its own service/controller/routes files and its own
tables, a team of contributors can work on, e.g., the training module without
touching the policies module's files — which is exactly the "keeps the
codebase manageable for a ... student team working in parallel" rationale
given in Proposal Section 11.

## Request lifecycle (a write request, e.g. "acknowledge a policy")

1. React calls `api.post('/policies/:id/acknowledge', ...)` — the shared
   Axios client (`frontend/src/api/client.js`) automatically attaches the
   JWT access token and the CSRF header.
2. Express middleware chain runs in this order: `helmet` → `cors` →
   `express.json` → `cookieParser` → `apiLimiter` (rate limit) →
   `verifyCsrf` → route-specific `requireAuth` → `express-validator` chain
   → `runValidation` → controller.
3. The controller calls the policies service, which runs a parameterised
   SQL query (never string-concatenated SQL).
4. On success, the controller calls `recordAudit()`, writing an
   `audit_log` row — this is what makes the action traceable later from
   the Admin/System Owner Audit Log page.
5. A JSON response goes back to the client; errors of any kind are caught
   by the final `errorHandler` middleware so no stack trace ever reaches
   the browser.

## Why three roles map to three route-guard tiers

`backend/src/middleware/rbac.js` exposes `requireRole(...)` and a
`READ_ONLY_ROLES = ['administrator', 'system_owner']` constant. Every route
file in `backend/src/modules/*/*.routes.js` is annotated with exactly which
tier it needs:

- **Public** (no `requireAuth`): register, login, password-reset request/complete.
- **Any authenticated user**: read policies, read/attempt training, view own
  assets, manage own profile/MFA.
- **`READ_ONLY_ROLES`** (administrator OR system_owner): view all users, view
  audit log, view dashboard KPIs, view outstanding acknowledgements.
- **`'administrator'` only**: every mutating admin action — create/suspend/
  delete users, change roles, publish policies, resolve asset requests, add
  inventory. System Owner is **never** included in a mutating route, which is
  what actually enforces the "read-only... for governance and oversight
  purposes" role definition from Proposal Section 7 — not just a hidden UI
  button.
