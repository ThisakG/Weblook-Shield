const { body, param } = require('express-validator');

const moduleIdParam = [param('id').isUUID()];
const submitQuizValidators = [
  param('id').isUUID(),
  body('answers').isObject().withMessage('answers must be an object of { questionId: optionKey }'),
];

module.exports = { moduleIdParam, submitQuizValidators };
