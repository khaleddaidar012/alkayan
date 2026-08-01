const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getUsers, getUser, createUser, updateUser,
  deleteUser, updatePermissions, toggleStatus
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.get('/', getUsers);

router.get('/:id', getUser);

router.post('/', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'manager', 'employee']).withMessage('Invalid role')
], createUser);

router.put('/:id', [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').optional().isEmail().withMessage('Please enter a valid email'),
  body('role').optional().isIn(['admin', 'manager', 'employee']).withMessage('Invalid role')
], updateUser);

router.delete('/:id', deleteUser);

router.put('/:id/permissions', updatePermissions);

router.put('/:id/status', toggleStatus);

module.exports = router;
