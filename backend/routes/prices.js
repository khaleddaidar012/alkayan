const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { getPrices, updatePrices } = require('../controllers/priceController');
const { protect, authorize } = require('../middleware/auth');

const validatePrice = (field) => body(field)
  .optional()
  .isFloat({ min: 0 })
  .withMessage(`${field} must be a positive number`)
  .custom((value) => {
    const n = Number(value);
    if (isNaN(n)) throw new Error(`${field} must be a valid number`);
    const decimals = String(n).split('.')[1];
    if (decimals && decimals.length > 2) throw new Error(`${field} can have at most 2 decimal places`);
    return true;
  });

router.get('/', getPrices);

router.put('/',
  protect,
  authorize('admin'),
  [
    validatePrice('egypt_price'),
    validatePrice('saudi_arabia_price'),
    validatePrice('oman_price'),
    validatePrice('libya_price'),
    validatePrice('usd_fallback_price')
  ],
  updatePrices
);

module.exports = router;