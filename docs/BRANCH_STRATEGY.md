# Branch Strategy — 4 Contributors

The proposal's system architecture (Section 11) deliberately separates the
platform into services — "authentication, policy management, awareness
content, and monitoring" — specifically so a multi-person student team can
work in parallel without stepping on each other's files. This repository's
Git history mirrors that split directly: **one feature branch per
contributor**, each merged into `main` once its module was complete.

## Branch → contributor → module map

| Branch | Owns | Backend files | Frontend files |
|---|---|---|---|
| `feature/auth-identity-access` | **Contributor 1** — Identity & Access Management | `backend/src/modules/auth/*`, `backend/src/modules/users/*`, `backend/src/middleware/auth.js`, `rbac.js`, `csrf.js` | `frontend/src/pages/auth/*`, `frontend/src/pages/employee/Profile.jsx`, `frontend/src/pages/admin/UserManagement.jsx`, `AuthContext.jsx`, `ProtectedRoute.jsx` |
| `feature/policy-asset-management` | **Contributor 2** — Policy Library & Asset Inventory | `backend/src/modules/policies/*`, `backend/src/modules/assets/*` | `frontend/src/pages/employee/PolicyLibrary.jsx`, `PolicyDetail.jsx`, `Assets.jsx`, `frontend/src/pages/admin/PolicyManagement.jsx`, `AssetInventory.jsx` |
| `feature/security-awareness-training` | **Contributor 3** — Security Awareness & Training | `backend/src/modules/training/*` | `frontend/src/pages/employee/Training.jsx`, `TrainingModule.jsx` |
| `feature/dashboards-monitoring-audit` | **Contributor 4** — Dashboards, Audit & Monitoring | `backend/src/modules/audit/*`, `backend/src/modules/dashboard/*` | `frontend/src/pages/admin/AdminOverview.jsx`, `AuditLog.jsx`, `frontend/src/pages/employee/Dashboard.jsx`, `frontend/src/pages/systemowner/Oversight.jsx`, `frontend/src/components/Layout.jsx`, `StatCard.jsx` |

## Shared scaffold (on `main` before any feature branch)

The following were treated as infrastructure the whole team agrees on
upfront — much like the ER diagram/schema being fixed before four people can
build against it in parallel — and were committed directly to `main`:

- `backend/src/db/schema.sql` (the whole data model)
- `backend/src/config/*`, `backend/src/utils/*` (env loading, DB pool, JWT/password/TOTP helpers, logger)
- `backend/src/app.js`, `server.js` (Express wiring, security headers)
- `frontend` build tooling (`vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `main.jsx`, `App.jsx` route table, `styles/index.css` — the Red/Gray/White theme)
- Root-level project files: `README.md`, `.gitignore`, `docker-compose.yml`, `.github/workflows/ci.yml`, `docs/`

## Working with this history

```bash
git log --oneline --graph --all     # see the whole 4-branch merge history
git checkout feature/auth-identity-access   # inspect just Contributor 1's work
```

If your team wants to keep developing feature-by-feature after cloning this
repo, branch again from `main` the same way:

```bash
git checkout main
git pull
git checkout -b feature/my-next-change
# ...commit...
git push -u origin feature/my-next-change
# open a Pull Request into main — .github/workflows/ci.yml runs lint + tests automatically
```
