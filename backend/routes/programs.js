const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getPrograms, getProgram, createProgram,
  updateProgram, deleteProgram, exportPrograms, getProgramsOverview
} = require('../controllers/programController');
const { getProgramStats } = require('../controllers/programStatsController');
const { protect, authorize, checkPermission } = require('../middleware/auth');

router.use(protect);

router.get('/export', checkPermission('programs', 'view'), exportPrograms);
router.get('/stats', checkPermission('programs', 'view'), getProgramsOverview);
router.get('/', checkPermission('programs', 'view'), getPrograms);
router.get('/:id', checkPermission('programs', 'view'), getProgram);
router.get('/:id/stats', checkPermission('programs', 'view'), getProgramStats);

router.post('/', checkPermission('programs', 'add'), [
  body('name').trim().notEmpty().withMessage('Program name is required')
], createProgram);

router.put('/:id', checkPermission('programs', 'edit'), [
  body('name').optional().trim().notEmpty().withMessage('Program name cannot be empty')
], updateProgram);

router.delete('/:id', checkPermission('programs', 'delete'), deleteProgram);

module.exports = router;
