# Hosting Guide — Render (backend + database) + Vercel (frontend)

This is the deployment path actually used for the demo/pilot: **no Docker
required**. `docker-compose.yml` is kept in the repo only as an optional way
to run the whole stack locally with one command — Render and Vercel build
straight from the `backend/` and `frontend/` folders instead.

A condensed version of these same steps is also given directly in the chat
response that shipped this codebase.

---

## Overview

| Piece | Where it runs | Why |
|---|---|---|
| PostgreSQL database | Render (Managed Postgres) | Same provider as the API — simplest private networking, free tier available |
| Express API (backend/) | Render (Web Service) | Node build support, free tier, environment-variable secrets management |
| React SPA (frontend/) | Vercel | Best-in-class static/SPA hosting, instant previews, generous free tier |

---

## Part 1 — Push the code to GitHub

1. Create a new **empty** repository on GitHub, e.g. `weblook-shield`.
2. From the project root:
   ```bash
   git remote add origin https://github.com/<your-org>/weblook-shield.git
   git push -u origin main
   git push origin feature/auth-identity-access
   git push origin feature/policy-asset-management
   git push origin feature/security-awareness-training
   git push origin feature/dashboards-monitoring-audit
   ```
   (This repo already has these branches and their history — see
   `docs/BRANCH_STRATEGY.md`.)

---

## Part 2 — Database on Render

1. Render Dashboard → **New +** → **PostgreSQL**.
2. Name: `weblook-shield-db`. Choose a region close to you. Free or Starter plan is enough for a pilot/demo.
3. Once created, open the database and copy the **Internal Database URL** (starts `postgresql://...`) — you'll use this for the backend's `DATABASE_URL`. Use the **External Database URL** only if you need to run `psql`/seed from your own laptop.
4. From your laptop, apply the schema and seed data using the **External** URL:
   ```bash
   psql "<External Database URL>" -f backend/src/db/schema.sql
   DATABASE_URL="<External Database URL>" node backend/src/db/seed.js
   ```
   (Run `npm install` inside `backend/` first if you haven't already, so `node` can resolve `pg`/`bcrypt`.)

---

## Part 3 — Backend API on Render

1. Render Dashboard → **New +** → **Web Service** → connect the GitHub repo.
2. Configure:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Branch:** `main`
3. Add environment variables (Render → your service → **Environment**):

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | the **Internal** Database URL from Part 2 |
   | `JWT_ACCESS_SECRET` | output of `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `JWT_REFRESH_SECRET` | a **different** random string, same command |
   | `CSRF_SECRET` | a **third** random string, same command |
   | `CORS_ORIGIN` | your Vercel URL, e.g. `https://weblook-shield.vercel.app` (comma-separate if you also want a preview URL) |
   | `MAX_FAILED_LOGIN_ATTEMPTS` | `5` |
   | `LOCKOUT_DURATION_MINUTES` | `15` |
   | `BCRYPT_ROUNDS` | `12` |

4. Deploy. Once live, note the backend's public URL, e.g. `https://weblook-shield-api.onrender.com`.
5. Sanity check: `curl https://weblook-shield-api.onrender.com/api/health` should return `{"status":"ok", ...}`.

> **Free-tier note:** Render's free web services spin down after inactivity and take ~30–60s to wake on the next request. Fine for a demo; upgrade to a paid instance for the actual on-campus demonstration if you want zero cold-start delay.

---

## Part 4 — Frontend on Vercel

1. Vercel Dashboard → **Add New...** → **Project** → import the same GitHub repo.
2. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `dist` (default)
3. Add an environment variable:

   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | your Render backend URL + `/api`, e.g. `https://weblook-shield-api.onrender.com/api` |

4. Deploy. Vercel gives you a URL like `https://weblook-shield.vercel.app`.
5. **Go back to Render** and make sure `CORS_ORIGIN` on the backend exactly matches this Vercel URL (no trailing slash), then redeploy the backend if you changed it.

---

## Part 5 — Cookies across two different domains

The refresh-token and CSRF cookies are set by the backend (`*.onrender.com`) but read by a frontend on a different domain (`*.vercel.app`). For that to work in production:

- `REFRESH_COOKIE_OPTS` / `CSRF_COOKIE_OPTS` in `backend/src/modules/auth/auth.controller.js` already set `secure: true` when `NODE_ENV=production` — required because cross-site cookies must be sent over HTTPS, and both Render and Vercel serve HTTPS by default.
- They currently use `sameSite: 'strict'`. **Strict** cookies are not sent on top-level cross-site navigations from another origin, but they *are* sent on same-site XHR/fetch calls made from JS running on the frontend to the backend as long as the request is not a "cross-site" browser navigation — which is the case here (Axios `withCredentials: true` requests from your Vercel-hosted JS to your Render API). If you find sessions aren't persisting across the two domains after deploying, change `sameSite: 'strict'` to `sameSite: 'none'` in `auth.controller.js` (still paired with `secure: true`, which is mandatory when using `SameSite=None`) and redeploy the backend.

---

## Part 6 — First login

Open your Vercel URL and sign in with the seeded demo accounts:

| Role | Email | Password |
|---|---|---|
| System Owner | `owner@weblook.com` | `OwnerPass!2026` |
| Administrator | `admin@weblook.com` | `AdminPass!2026` |
| Employee | `employee@weblook.com` | `EmployeePass!2026` |

**Change these passwords (or delete/recreate the accounts) before any real demonstration outside your team** — they are seed data, not production credentials.

---

## Updating the live deployment later

Both Render and Vercel auto-deploy on every push to `main`:

```bash
git checkout main
git merge feature/<your-branch>
git push origin main
```

Render rebuilds the API; Vercel rebuilds the SPA. No manual redeploy step needed once the two services are connected to the repo.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Frontend loads but API calls fail with a CORS error | `CORS_ORIGIN` on Render doesn't exactly match the Vercel URL, or is missing `https://` |
| Login succeeds but a page refresh logs you out | Cookie `SameSite`/`secure` mismatch across domains — see Part 5 |
| 500 error with no detail in the browser | Expected — `errorHandler.js` hides internals in production. Check the Render service logs for the real stack trace |
| `relation "users" does not exist` | The schema wasn't applied — re-run the `psql ... -f backend/src/db/schema.sql` step in Part 2 |
| Backend takes ~30s to respond the first time | Render free-tier cold start — normal, see the note in Part 3 |
