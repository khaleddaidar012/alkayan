const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getCustomers, getCustomer, createCustomer,
  updateCustomer, deleteCustomer, updateCustomerStatus,
  updatePayment, deletePayment
} = require('../controllers/customerController');
const { createPayment, getPayments, getPaymentSummary, getCustomerDebt } = require('../controllers/paymentController');
const { logCommunication, getCommunications, getCommunicationStats, incrementCounter } = require('../controllers/communicationController');
const { addMessage, getMessages, getLatestMessages } = require('../controllers/messageController');
const { updateCustomerStatus: updateStatusByStatusId, getStatusHistory } = require('../controllers/customerStatusController');
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
  body('status').optional().notEmpty().withMessage('Status is required'),
  body('status_id').optional().isMongoId().withMessage('Invalid status id')
], (req, res, next) => {
  if (req.body.status_id) return updateStatusByStatusId(req, res, next);
  return updateCustomerStatus(req, res, next);
});

router.get('/:id/status-history', getStatusHistory);

router.post('/:customerId/payments', authorize('admin', 'manager'), upload.single('receipt'), [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required')
], createPayment);

router.get('/:customerId/payments', getPayments);
router.get('/:customerId/payments/summary', getPaymentSummary);
router.get('/:customerId/debt', getCustomerDebt);

router.put('/:customerId/payments/:paymentId', authorize('admin', 'manager'), updatePayment);

router.delete('/:customerId/payments/:paymentId', authorize('admin', 'manager'), deletePayment);

router.post('/:customerId/communications', authorize('admin', 'manager', 'employee'), [
  body('type_id').optional().isMongoId().withMessage('Invalid communication type'),
  body('communication_date').optional().isISO8601().withMessage('Invalid communication date'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes must be under 1000 characters')
], logCommunication);

router.get('/:customerId/communications', getCommunications);
router.get('/:customerId/communications/stats', getCommunicationStats);

router.post('/:customerId/increment-communication', authorize('admin', 'manager', 'employee'), incrementCounter);

router.post('/:customerId/messages', authorize('admin', 'manager', 'employee'), [
  body('sender_type').isIn(['customer', 'employee']).withMessage('Sender type must be customer or employee'),
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1-2000 characters')
], addMessage);

router.get('/:customerId/messages', getMessages);
router.get('/:customerId/messages/latest', getLatestMessages);

module.exports = router;
