const { body } = require('express-validator');
const { normalizePhone, COUNTRY_KEYS } = require('../utils/countryDetection');

const COUNTRY_VALUES = COUNTRY_KEYS;

function isValidPhone(value) {
  if (value === undefined || value === null) return false;
  const digits = normalizePhone(value);
  return /^[0-9]{7,15}$/.test(digits);
}

const OPTIONAL_FALSY = { values: 'falsy' };

const createCustomerValidators = [
  body().custom((value, { req }) => {
    const phone = req.body.phone || req.body.whatsapp || req.body.whatsapp_number;
    if (!phone) throw new Error('WhatsApp number is required');
    if (!isValidPhone(phone)) throw new Error('Invalid phone/WhatsApp number format');
    return true;
  }),
  body('whatsapp_number').optional(OPTIONAL_FALSY).custom(isValidPhone).withMessage('Invalid WhatsApp number'),
  body('phone').optional(OPTIONAL_FALSY).custom(isValidPhone).withMessage('Invalid phone number'),
  body('country')
    .optional(OPTIONAL_FALSY)
    .isIn(COUNTRY_VALUES)
    .withMessage('Invalid country'),
  body('name_ar').optional(OPTIONAL_FALSY).trim().isLength({ max: 100 }).withMessage('Arabic name must be 100 characters or less'),
  body('name_en').optional(OPTIONAL_FALSY).trim().isLength({ max: 100 }).withMessage('English name must be 100 characters or less')
];

const updateCustomerValidators = [
  body('whatsapp_number').optional(OPTIONAL_FALSY).custom(isValidPhone).withMessage('Invalid WhatsApp number'),
  body('phone').optional(OPTIONAL_FALSY).custom(isValidPhone).withMessage('Invalid phone number'),
  body('country')
    .optional(OPTIONAL_FALSY)
    .isIn(COUNTRY_VALUES)
    .withMessage('Invalid country'),
  body('name_ar').optional(OPTIONAL_FALSY).trim().isLength({ max: 100 }).withMessage('Arabic name must be 100 characters or less'),
  body('name_en').optional(OPTIONAL_FALSY).trim().isLength({ max: 100 }).withMessage('English name must be 100 characters or less')
];

module.exports = { isValidPhone, createCustomerValidators, updateCustomerValidators };