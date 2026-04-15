const { body } = require('express-validator');

const siteValidation = [
  body('name').trim().notEmpty().withMessage('Site name is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
];

module.exports = { siteValidation };
