/**
 * password.test.js
 * ----------------------------------------------------------------------------
 * Unit tests for the password strength rule and hashing round-trip.
 * Satisfies the Maintainability NFR: "includes basic automated tests for
 * authentication and RBAC logic." These tests need no database connection,
 * so they run instantly in CI on every pull request.
 * ----------------------------------------------------------------------------
 */
const { isPasswordStrongEnough, hashPassword, verifyPassword } = require('../src/utils/password');

describe('Password strength rule (WSP-04: minimum 14 characters)', () => {
  test('rejects passwords shorter than 14 characters', () => {
    expect(isPasswordStrongEnough('Short1!')).toBe(false);
  });

  test('rejects 14+ character passwords with only letters', () => {
    expect(isPasswordStrongEnough('aaaaaaaaaaaaaa')).toBe(false);
  });

  test('accepts a strong 14+ character passphrase with a letter and a digit', () => {
    expect(isPasswordStrongEnough('CorrectHorse7Battery')).toBe(true);
  });
});

describe('Password hashing (bcrypt)', () => {
  test('hash is never equal to the plaintext password', async () => {
    const hash = await hashPassword('CorrectHorse7Battery');
    expect(hash).not.toBe('CorrectHorse7Battery');
  });

  test('verifyPassword returns true for the correct password and false otherwise', async () => {
    const hash = await hashPassword('CorrectHorse7Battery');
    await expect(verifyPassword('CorrectHorse7Battery', hash)).resolves.toBe(true);
    await expect(verifyPassword('WrongPassword123', hash)).resolves.toBe(false);
  });
});
