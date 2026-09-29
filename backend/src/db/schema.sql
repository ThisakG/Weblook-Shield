-- ============================================================================
-- WEBLOOK SHIELD — DATABASE SCHEMA
-- ----------------------------------------------------------------------------
-- This file is the single source of truth for the platform's relational
-- structure. It is applied once when the Postgres container starts (see
-- docker-compose.yml) or manually via `psql -f schema.sql`.
--
-- WHY a plain .sql file instead of an ORM's auto-migration?
--   The proposal (Section 12) calls for PostgreSQL with parameterised
--   queries. Keeping the schema in an explicit, readable file makes it easy
--   for four different contributors to reason about relationships without
--   needing to run an ORM toolchain first, and it doubles as living
--   documentation of the ER model referenced in the proposal (Section 13).
-- ============================================================================

-- Using pgcrypto for gen_random_uuid() so every primary key is a UUID rather
-- than a sequential integer. UUIDs avoid leaking record counts (e.g. "user
-- #4") to anyone who sees an ID in a URL or API response — a small but real
-- data-minimisation/privacy improvement referenced by the Privacy/Ethics NFR.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- ROLES
-- ----------------------------------------------------------------------------
-- The three roles from Proposal Section 7. Kept as a table (not an enum) so
-- an administrator could add a role later without a schema migration, while
-- the RBAC engine (backend/src/middleware/rbac.js) still enforces which
-- permissions each role name maps to.
CREATE TABLE IF NOT EXISTS roles (
    id          SMALLINT PRIMARY KEY,
    name        VARCHAR(32) NOT NULL UNIQUE,      -- 'employee' | 'administrator' | 'system_owner'
    description TEXT
);

INSERT INTO roles (id, name, description) VALUES
    (1, 'employee',      'Weblook staff member: acknowledges policies, completes training, tracks own compliance.'),
    (2, 'administrator',  'Manages users, roles, policies, awareness content and the asset inventory.'),
    (3, 'system_owner',   'Executive sponsor with read-only oversight of aggregate compliance and audit data.')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- USERS
-- ----------------------------------------------------------------------------
-- Central identity table. Passwords are NEVER stored in plain text — only
-- a bcrypt hash (see backend/src/utils/password.js). MFA secrets are stored
-- encrypted-at-rest is out of scope for the demo DB, but are only ever read
-- server-side, never returned to the client (see modules/auth).
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(120)  NOT NULL,
    email           VARCHAR(160)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,          -- bcrypt hash, never plaintext
    department      VARCHAR(80),
    role_id         SMALLINT NOT NULL REFERENCES roles(id),
    status          VARCHAR(20)  NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'locked', 'suspended')),
    mfa_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret      VARCHAR(64),                      -- TOTP base32 secret, only set once MFA is enabled
    failed_login_attempts SMALLINT NOT NULL DEFAULT 0, -- feeds automatic lockout (NFR: Security)
    locked_until    TIMESTAMPTZ,                       -- temporary lockout window
    last_login_at   TIMESTAMPTZ,
    must_reset_password BOOLEAN NOT NULL DEFAULT FALSE, -- admin can force a reset
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Refresh tokens are stored hashed (never the raw token) so a DB leak alone
-- cannot be used to mint new access tokens — mirrors the access/refresh JWT
-- pattern from Proposal Section 12.
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);

-- Time-limited, single-use password reset tokens (hashed at rest).
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- POLICY LIBRARY  (Functional Requirements, Section 8 — "Information Policy
-- Documentation Section")
-- ----------------------------------------------------------------------------
-- A "policy" is the stable concept (e.g. WSP-01 Acceptable Use Policy); a
-- "policy_version" is a specific, versioned body of text. Acknowledgements
-- point at a VERSION, not the policy itself, so that "Jane acknowledged
-- v1.0" remains historically true even after v1.1 is published — this is
-- exactly the acknowledgement/versioning behaviour required by the proposal.
CREATE TABLE IF NOT EXISTS policies (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(20)  NOT NULL UNIQUE,     -- e.g. 'WSP-01'
    title       VARCHAR(160) NOT NULL,
    category    VARCHAR(80)  NOT NULL,            -- used for search/filter/tagging
    owner       VARCHAR(120) NOT NULL,            -- policy owner, e.g. 'Chief Operations Officer'
    is_device_policy BOOLEAN NOT NULL DEFAULT FALSE, -- flags the AUP so the UI can link the live asset inventory
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policy_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id       UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    version_label   VARCHAR(20) NOT NULL,          -- e.g. '1.0'
    content         TEXT NOT NULL,                 -- policy body (markdown/plain text for the demo)
    is_current      BOOLEAN NOT NULL DEFAULT FALSE, -- exactly one TRUE row per policy_id, enforced in app logic
    published_by    UUID REFERENCES users(id),
    published_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    retired_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_policy_versions_policy ON policy_versions(policy_id);

-- One acknowledgement per (user, policy_version) — a user cannot "unsign".
CREATE TABLE IF NOT EXISTS policy_acknowledgements (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    policy_version_id   UUID NOT NULL REFERENCES policy_versions(id) ON DELETE CASCADE,
    acknowledged_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, policy_version_id)
);

-- ----------------------------------------------------------------------------
-- SECURITY AWARENESS TRAINING  (Functional Requirements, Section 8)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS training_modules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title               VARCHAR(160) NOT NULL,
    description         TEXT,
    lesson_content      TEXT NOT NULL,             -- plain-language lesson body
    estimated_minutes   SMALLINT NOT NULL DEFAULT 10,
    order_index         SMALLINT NOT NULL DEFAULT 0,
    pass_mark_percent   SMALLINT NOT NULL DEFAULT 60
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id       UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
    prompt          TEXT NOT NULL,
    options         JSONB NOT NULL,                -- [{ "key": "A", "text": "..." }, ...]
    correct_option  VARCHAR(4) NOT NULL,            -- e.g. 'A'
    order_index     SMALLINT NOT NULL DEFAULT 0
);

-- Tracks whether an employee has completed (passed) a module.
CREATE TABLE IF NOT EXISTS training_progress (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_id       UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'not_started'
                        CHECK (status IN ('not_started', 'in_progress', 'completed')),
    completed_at    TIMESTAMPTZ,
    UNIQUE (user_id, module_id)
);

-- Every quiz attempt is kept (not just the best score) to support an
-- auditable history, consistent with the Auditability NFR.
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_id       UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
    score_percent   SMALLINT NOT NULL,
    passed          BOOLEAN NOT NULL,
    attempted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- ASSET INVENTORY & REQUESTS  (linked to the Acceptable Use Policy, per
-- Proposal Section 8: "Asset requesting mechanism attached to the asset
-- inventory")
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_tag       VARCHAR(40) NOT NULL UNIQUE,     -- e.g. 'LAPTOP-0042'
    asset_type      VARCHAR(60) NOT NULL,            -- e.g. 'Laptop', 'Mobile Phone', 'Security Key'
    description     TEXT,
    assigned_to     UUID REFERENCES users(id),        -- NULL = unassigned / in the pool
    status          VARCHAR(20) NOT NULL DEFAULT 'available'
                        CHECK (status IN ('available', 'assigned', 'retired')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asset_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_type      VARCHAR(60) NOT NULL,
    justification   TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_by     UUID REFERENCES users(id),
    resolved_at     TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- AUDIT LOG  (Auditability NFR: "Every security-relevant action ... logged
-- to an append-only audit store with timestamp and actor.")
-- ----------------------------------------------------------------------------
-- No UPDATE or DELETE grants are issued against this table anywhere in the
-- application code (see modules/audit) — it is insert-and-read only, which
-- is what "append-only" means in practice for a relational table.
CREATE TABLE IF NOT EXISTS audit_log (
    id              BIGSERIAL PRIMARY KEY,
    actor_id        UUID REFERENCES users(id),
    actor_email     VARCHAR(160),               -- denormalised so the log stays readable even if the user is later deleted
    action          VARCHAR(80) NOT NULL,       -- e.g. 'LOGIN_SUCCESS', 'POLICY_PUBLISHED', 'ROLE_CHANGED'
    target_type     VARCHAR(40),                -- e.g. 'user', 'policy', 'asset_request'
    target_id       VARCHAR(64),
    details         JSONB,
    ip_address      VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
