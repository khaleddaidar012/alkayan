const express = require('express');
const router = express.Router();
const { getAggregatedReports } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/aggregated', getAggregatedReports);

module.exports = router;