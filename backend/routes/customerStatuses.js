const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getStatuses, createStatus, updateStatus, deleteStatus, reorderStatuses,
  updateCustomerStatus, getStatusHistory
} = require('../controllers/customerStatusController');
const { protect, authorize } = require('../middleware/auth');
const { objectIdParam } = require('../middleware/validateObjectId');

router.param('id', objectIdParam('id'));
router.param('customerId', objectIdParam('customerId'));

router.get('/', getStatuses);
router.get('/:customerId/status-history', protect, getStatusHistory);

router.put('/:customerId/status', protect, [
  body('status_id').notEmpty().withMessage('status_id is required'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be under 500 characters')
], updateCustomerStatus);

router.post('/', protect, authorize('admin'), [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Status name must be 2-80 characters'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex like #RRGGBB'),
  body('description').optional().trim().isLength({ max: 300 }).withMessage('Description must be under 300 characters'),
  body('sort_order').optional().isFloat({ min: 0 }).withMessage('Sort order must be positive')
], createStatus);

router.put('/:id', protect, authorize('admin'), [
  body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Status name must be 2-80 characters'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex like #RRGGBB'),
  body('description').optional().trim().isLength({ max: 300 }).withMessage('Description must be under 300 characters'),
  body('sort_order').optional().isFloat({ min: 0 }).withMessage('Sort order must be positive')
], updateStatus);

router.put('/reorder/all', protect, authorize('admin'), reorderStatuses);

router.delete('/:id', protect, authorize('admin'), deleteStatus);

module.exports = router;