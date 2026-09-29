/**
 * auth.validators.js
 * ----------------------------------------------------------------------------
 * express-validator chains for every auth endpoint. Kept in their own file
 * so auth.routes.js stays readable — routes read as: path, validation
 * chain, runValidation, controller.
 * ----------------------------------------------------------------------------
 */
const { body } = require('express-validator');
const { isPasswordStrongEnough } = require('../../utils/password');

const registerValidators = [
  body('fullName').trim().isLength({ min: 2, max: 120 }).withMessage('Full name is required.'),
  body('email').trim().isEmail().withMessage('A valid email address is required.').normalizeEmail(),
  body('password').custom((value) => {
    if (!isPasswordStrongEnough(value)) {
      // Matches WSP-04: minimum 14 characters, letters + at least one
      // number/symbol.
      throw new Error('Password must be at least 14 characters and include a letter and a number or symbol.');
    }
    return true;
  }),
  body('department').optional().trim().isLength({ max: 80 }),
];

const loginValidators = [
  body('email').trim().isEmail().withMessage('A valid email address is required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
  body('mfaCode').optional().isLength({ min: 6, max: 6 }).isNumeric(),
];

const requestResetValidators = [
  body('email').trim().isEmail().withMessage('A valid email address is required.').normalizeEmail(),
];

const completeResetValidators = [
  body('token').isString().isLength({ min: 32 }),
  body('newPassword').custom((value) => {
    if (!isPasswordStrongEnough(value)) {
      throw new Error('Password must be at least 14 characters and include a letter and a number or symbol.');
    }
    return true;
  }),
];

module.exports = { registerValidators, loginValidators, requestResetValidators, completeResetValidators };
