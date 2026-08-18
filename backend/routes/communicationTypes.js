const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getTypes, getType, createType, updateType, deleteType
} = require('../controllers/communicationTypeController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getTypes);
router.get('/:id', protect, getType);

router.post('/', protect, authorize('admin'), [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Type name must be 2-80 characters'),
  body('icon').optional().trim().isLength({ min: 1, max: 10 }).withMessage('Icon must be 1-10 characters'),
  body('sort_order').optional().isFloat({ min: 0 }).withMessage('Sort order must be positive')
], createType);

router.put('/:id', protect, authorize('admin'), [
  body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Type name must be 2-80 characters'),
  body('icon').optional().trim().isLength({ min: 1, max: 10 }).withMessage('Icon must be 1-10 characters'),
  body('sort_order').optional().isFloat({ min: 0 }).withMessage('Sort order must be positive')
], updateType);

router.delete('/:id', protect, authorize('admin'), deleteType);

module.exports = router;