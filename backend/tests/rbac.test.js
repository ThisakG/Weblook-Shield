/**
 * rbac.test.js
 * ----------------------------------------------------------------------------
 * Unit tests for the RBAC middleware, using lightweight mock req/res objects
 * rather than a running server — verifies the core access-control invariant
 * described in Proposal Section 10: "no client-side-only permission checks"
 * (i.e. this server-side check is the real gate, and it must behave
 * correctly on its own).
 * ----------------------------------------------------------------------------
 */
const { requireRole, READ_ONLY_ROLES } = require('../src/middleware/rbac');

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

describe('requireRole middleware', () => {
  test('blocks a request with no authenticated user (401)', () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();
    requireRole('administrator')(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('blocks an employee from an administrator-only route (403)', () => {
    const req = { user: { id: 'u1', role: 'employee' } };
    const res = mockRes();
    const next = jest.fn();
    requireRole('administrator')(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('allows an administrator through an administrator-only route', () => {
    const req = { user: { id: 'u2', role: 'administrator' } };
    const res = mockRes();
    const next = jest.fn();
    requireRole('administrator')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('READ_ONLY_ROLES allows both administrator and system_owner, but not employee', () => {
    const next = jest.fn();
    requireRole(...READ_ONLY_ROLES)({ user: { role: 'system_owner' } }, mockRes(), next);
    requireRole(...READ_ONLY_ROLES)({ user: { role: 'administrator' } }, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(2);

    const blockedNext = jest.fn();
    const res = mockRes();
    requireRole(...READ_ONLY_ROLES)({ user: { role: 'employee' } }, res, blockedNext);
    expect(res.statusCode).toBe(403);
    expect(blockedNext).not.toHaveBeenCalled();
  });
});
