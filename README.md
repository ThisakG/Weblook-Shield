# Weblook Shield

**Information Security Policy Awareness & Management Platform**
IE3072 — Information Security Policy and Management — Group 01

Weblook Shield is a full-stack web application built for Weblook International (Pvt) Ltd
to centralise information security policy management, security-awareness training,
compliance tracking and activity monitoring, as described in the Group 01 project
proposal.

## Tech stack (per the proposal, Section 12)

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend / API | Node.js + Express (REST API) |
| Authentication | JWT (access + refresh), bcrypt password hashing, TOTP MFA (speakeasy) |
| Database | PostgreSQL |
| Audit / Event Store | Append-only `audit_log` table |
| Hosting (demo) | **Render** (API + managed PostgreSQL) + **Vercel** (React SPA) — see `docs/HOSTING.md`. Docker Compose is also included as an optional one-command local setup. |
| Version Control / CI | Git + GitHub Actions (lint + test on every push/PR) |

## Repository layout

```
weblook-shield/
├── backend/          # Express REST API (see backend/README below in this file)
├── frontend/          # React SPA
├── docs/              # Architecture & branch-strategy notes
├── docker-compose.yml # One-command local/demo deployment
└── .github/workflows/ci.yml
```

## Quick start — local development (without Docker)

**Prerequisites:** Node.js 20+, PostgreSQL 16+ running locally, npm.

```bash
# 1. Database
createdb weblook_shield
psql weblook_shield -f backend/src/db/schema.sql

# 2. Backend
cd backend
cp .env.example .env          # then edit .env: set JWT/CSRF secrets and your DATABASE_URL
npm install
npm run seed                  # loads demo accounts, the 6 WSP policies, and 6 training modules
npm run dev                   # http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

Open http://localhost:5173.

## Hosting the live demo — Render + Vercel

The actual pilot deployment runs the backend + database on **Render** and the
frontend on **Vercel** (no Docker in production). Full step-by-step
instructions are in **[`docs/HOSTING.md`](docs/HOSTING.md)**.

## Quick start — Docker (optional, for one-command local setup)

```bash
cp .env.example .env          # fill in JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, CSRF_SECRET
docker compose up --build

# In a separate terminal, once containers are healthy, apply seed data:
docker compose exec backend node src/db/seed.js
```

Open http://localhost:8080 (frontend, proxying `/api` to the backend container).

See **docs/HOSTING.md** (also provided in chat) for full production hosting instructions.

## Demo accounts (created by `npm run seed`)

| Role | Email | Password |
|---|---|---|
| System Owner | owner@weblook.com | OwnerPass!2026 |
| Administrator | admin@weblook.com | AdminPass!2026 |
| Employee | employee@weblook.com | EmployeePass!2026 |

MFA is **off** by default on these seeded accounts so you can log straight in;
enable it from **Profile & Security** to see the TOTP enrolment flow.

## Running tests

```bash
cd backend && npm test
```

## Documents referenced while building this platform

This codebase implements the functional requirements, non-functional
requirements, secure-coding considerations, architecture, and technology
stack from `2026-S2-IE3072-Assignment1-Group_Assignment-SpecificationWithMarkingScheme-V1.docx`
and `IE3072__Project_Proposal__Weblook_Shield__Group_01.pdf`. Policy text is
sourced from `Weblook_International_Information_Security_Policy_Library-corrected.docx`,
training content from `Weblook_Shield_Security_Awareness_Training_Content.docx`, and
the Application Acceptable Use Policy deliverable is derived from
`Weblook_Shield_Application_Acceptable_Use_Policy.docx`.

See `docs/ARCHITECTURE.md`, `docs/BRANCH_STRATEGY.md`, and `docs/HOSTING.md` for more detail.
