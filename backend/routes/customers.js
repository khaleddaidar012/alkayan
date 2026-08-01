const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getCustomers, getCustomer, createCustomer,
  updateCustomer, deleteCustomer, updateCustomerStatus, addPayment,
  updatePayment, deletePayment
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getCustomers);
router.get('/:id', getCustomer);

router.post('/', authorize('admin', 'manager', 'employee'), [
  body('name').trim().notEmpty().withMessage('Customer name is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required')
], createCustomer);

router.put('/:id', authorize('admin', 'manager', 'employee'), [
  body('name').optional().trim().notEmpty().withMessage('Customer name cannot be empty'),
  body('phone').optional().trim().notEmpty().withMessage('Phone number cannot be empty')
], updateCustomer);

router.delete('/:id', authorize('admin', 'manager'), deleteCustomer);

router.put('/:id/status', authorize('admin', 'manager', 'employee'), [
  body('status').notEmpty().withMessage('Status is required')
], updateCustomerStatus);

router.post('/:id/payments', authorize('admin', 'manager'), [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required')
], addPayment);

router.put('/:id/payments/:paymentId', authorize('admin', 'manager'), updatePayment);

router.delete('/:id/payments/:paymentId', authorize('admin', 'manager'), deletePayment);

module.exports = router;
