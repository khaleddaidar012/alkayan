const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getCustomers, getCustomer, createCustomer,
  updateCustomer, deleteCustomer, updateCustomerStatus,
  updatePayment, deletePayment
} = require('../controllers/customerController');
const { createPayment, getPayments, getPaymentSummary, getCustomerDebt } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../services/fileUpload');
const { createCustomerValidators, updateCustomerValidators } = require('../validators/customerValidator');

router.use(protect);

router.get('/', getCustomers);
router.get('/:id', getCustomer);

router.post('/', authorize('admin', 'manager', 'employee'), createCustomerValidators, createCustomer);

router.put('/:id', authorize('admin', 'manager', 'employee'), updateCustomerValidators, updateCustomer);

router.delete('/:id', authorize('admin', 'manager'), deleteCustomer);

router.put('/:id/status', authorize('admin', 'manager', 'employee'), [
  body('status').notEmpty().withMessage('Status is required')
], updateCustomerStatus);

router.post('/:customerId/payments', authorize('admin', 'manager'), upload.single('receipt'), [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required')
], createPayment);

router.get('/:customerId/payments', getPayments);
router.get('/:customerId/payments/summary', getPaymentSummary);
router.get('/:customerId/debt', getCustomerDebt);

router.put('/:customerId/payments/:paymentId', authorize('admin', 'manager'), updatePayment);

router.delete('/:customerId/payments/:paymentId', authorize('admin', 'manager'), deletePayment);

module.exports = router;
