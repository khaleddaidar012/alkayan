// Backend API routes for Tasks Management System
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getTasks, getTask, createTask, updateTask, deleteTask, updateTaskStatus
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Public routes with view permissions
router.get('/', getTasks);
router.get('/:id', getTask);

// Protected routes with permissions
router.post('/', authorize('admin', 'manager'), [
  body('title').trim().notEmpty().withMessage('Task title is required'),
  body('assignedTo').notEmpty().withMessage('Assigned user is required'),
  body('deadline').notEmpty().withMessage('Deadline is required'),
], createTask);

router.put('/:id', authorize('admin', 'manager'), [
  body('title').optional().trim().notEmpty().withMessage('Task title cannot be empty'),
  body('status').optional(),
  body('deadline').optional(),
], updateTask);

router.delete('/:id', authorize('admin'), deleteTask);

router.put('/:id/status', [
  body('status').notEmpty().withMessage('Status is required'),
], updateTaskStatus);

module.exports = router;