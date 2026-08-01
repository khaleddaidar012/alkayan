const Campaign = require('../models/Campaign');
const Customer = require('../models/Customer');
const { validationResult } = require('express-validator');

exports.getCampaigns = async (req, res) => {
  try {
    const { program, status, dateFrom, dateTo } = req.query;
    const filter = {};

    if (program) filter.program = program;
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.startDate = {};
      if (dateFrom) filter.startDate.$gte = new Date(dateFrom);
      if (dateTo) filter.startDate.$lte = new Date(dateTo);
    }

    const campaigns = await Campaign.find(filter)
      .populate('program', 'name')
      .populate('assignedEmployees', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ campaigns, count: campaigns.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('program', 'name description price')
      .populate('assignedEmployees', 'name email role')
      .populate({
        path: 'customers',
        populate: { path: 'assignedEmployee', select: 'name email role' }
      });

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ campaign });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createCampaign = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const {
      name, program, status, startDate, endDate,
      budget, description, notes, assignedEmployees
    } = req.body;

    const campaign = await Campaign.create({
      name, program, status, startDate, endDate,
      budget, description, notes, assignedEmployees
    });

    const populated = await Campaign.findById(campaign._id)
      .populate('program', 'name')
      .populate('assignedEmployees', 'name email role');

    res.status(201).json({ campaign: populated });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateCampaign = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const allowedFields = [
      'name', 'status', 'startDate', 'endDate',
      'budget', 'description', 'notes', 'assignedEmployees'
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('program', 'name')
     .populate('assignedEmployees', 'name email role');

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ campaign });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    await Customer.updateMany(
      { campaign: req.params.id },
      { $set: { campaign: null, registrationSource: 'direct' } }
    );

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addCustomerToCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { name, phone, whatsapp, email, assignedEmployee, registrationDate, status, notes, registrationSource } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone are required' });
    }

    const campaign = await Campaign.findById(campaignId).populate('program', 'name _id');
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const customer = await Customer.create({
      name, phone, whatsapp, email,
      program: campaign.program ? campaign.program.name : '',
      programRef: campaign.program ? campaign.program._id : null,
      campaign: campaignId,
      assignedEmployee,
      registrationDate: registrationDate || new Date(),
      status: status || 'potential',
      notes,
      registrationSource: registrationSource || 'campaign'
    });

    await Campaign.findByIdAndUpdate(campaignId, {
      $push: { customers: customer._id }
    });

    const populated = await Customer.findById(customer._id)
      .populate('assignedEmployee', 'name email role')
      .populate('campaign', 'name')
      .populate('programRef', 'name');

    res.status(201).json({ customer: populated });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.removeCustomerFromCampaign = async (req, res) => {
  try {
    const { campaignId, customerId } = req.params;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    await Campaign.findByIdAndUpdate(campaignId, {
      $pull: { customers: customerId }
    });

    await Customer.findByIdAndUpdate(customerId, {
      $set: { campaign: null, registrationSource: 'direct' }
    });

    res.json({ message: 'Customer removed from campaign successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
