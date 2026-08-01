const express = require('express');
const router = express.Router();
const { getFieldConfig, importData } = require('../controllers/importController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/fields/:collection', authorize('admin', 'manager', 'employee'), getFieldConfig);
router.post('/:collection', authorize('admin', 'manager', 'employee'), importData);

module.exports = router;