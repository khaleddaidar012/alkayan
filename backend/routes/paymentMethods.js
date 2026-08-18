const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getMethods, getMethod, createMethod, updateMethod, deactivateMethod
} = require('../controllers/paymentMethodController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getMethods);
router.get('/:id', protect, getMethod);

router.post('/', protect, authorize('admin'), [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Method name must be 2-80 characters'),
  body('country').optional().isIn(['egypt', 'saudi_arabia', 'oman', 'libya', 'other', 'global']).withMessage('Invalid country'),
  body('sort_order').optional().isFloat({ min: 0 }).withMessage('Sort order must be positive')
], createMethod);

router.put('/:id', protect, authorize('admin'), [
  body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Method name must be 2-80 characters'),
  body('country').optional().isIn(['egypt', 'saudi_arabia', 'oman', 'libya', 'other', 'global']).withMessage('Invalid country'),
  body('sort_order').optional().isFloat({ min: 0 }).withMessage('Sort order must be positive')
], updateMethod);

router.delete('/:id', protect, authorize('admin'), deactivateMethod);

module.exports = router;