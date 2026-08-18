const express = require('express');
const router = express.Router();
const { deletePayment } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

router.delete('/:id', protect, authorize('admin'), deletePayment);

module.exports = router;