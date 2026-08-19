const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getCampaigns, getCampaign, createCampaign,
  updateCampaign, deleteCampaign,
  addCustomerToCampaign, removeCustomerFromCampaign
} = require('../controllers/campaignController');
const { protect, authorize, checkPermission } = require('../middleware/auth');
const { objectIdParam } = require('../middleware/validateObjectId');

router.use(protect);
router.param('id', objectIdParam('id'));
router.param('campaignId', objectIdParam('campaignId'));
router.param('customerId', objectIdParam('customerId'));

router.get('/', checkPermission('campaigns', 'view'), getCampaigns);
router.get('/:id', checkPermission('campaigns', 'view'), getCampaign);

router.post('/', checkPermission('campaigns', 'add'), [
  body('name').trim().notEmpty().withMessage('Campaign name is required'),
  body('program').notEmpty().withMessage('Program is required'),
  body('startDate').notEmpty().withMessage('Start date is required'),
  body('endDate').notEmpty().withMessage('End date is required')
], createCampaign);

router.put('/:id', checkPermission('campaigns', 'edit'), [
  body('name').optional().trim().notEmpty().withMessage('Campaign name cannot be empty')
], updateCampaign);

router.delete('/:id', checkPermission('campaigns', 'delete'), deleteCampaign);

router.post('/:campaignId/customers', authorize('admin', 'manager', 'employee'), addCustomerToCampaign);

router.delete('/:campaignId/customers/:customerId', authorize('admin', 'manager'), removeCustomerFromCampaign);

module.exports = router;
