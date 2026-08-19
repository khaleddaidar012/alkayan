// Backend API routes for Goals Management System
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getGoals, getGoal, createGoal, updateGoal, deleteGoal
} = require('../controllers/goalController');
const { protect, authorize } = require('../middleware/auth');
const { objectIdParam } = require('../middleware/validateObjectId');

router.use(protect);
router.param('id', objectIdParam('id'));

// Public routes with view permissions
router.get('/', getGoals);
router.get('/:id', getGoal);

// Protected routes with permissions
router.post('/', authorize('admin', 'manager'), [
  body('title').trim().notEmpty().withMessage('Goal title is required'),
  body('employee').notEmpty().withMessage('Employee is required'),
  body('period').notEmpty().withMessage('Period is required'),
], createGoal);

router.put('/:id', authorize('admin', 'manager'), [
  body('title').optional().trim().notEmpty().withMessage('Goal title cannot be empty'),
  body('period').optional(),
  body('completed').optional(),
], updateGoal);

router.delete('/:id', authorize('admin'), deleteGoal);

module.exports = router;