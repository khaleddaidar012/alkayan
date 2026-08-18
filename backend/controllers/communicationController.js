const Communication = require('../models/Communication');
const CommunicationType = require('../models/CommunicationType');
const Customer = require('../models/Customer');
const { validationResult } = require('express-validator');

exports.logCommunication = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    const { customerId } = req.params;
    const customer = await Customer.findOne({ _id: customerId, isDeleted: { $ne: true } });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const { type_id, communication_date, notes } = req.body;
    let type = null;
    if (type_id) {
      type = await CommunicationType.findById(type_id);
      if (!type) return res.status(400).json({ message: 'Communication type not found' });
    }

    const communication = await Communication.create({
      customer: customerId,
      type: type ? type._id : null,
      typeName: type ? type.name : '',
      typeIcon: type ? type.icon : '',
      communication_date: communication_date ? new Date(communication_date) : new Date(),
      notes: notes || '',
      created_by: req.user ? req.user._id : null
    });

    const updated = await Customer.findByIdAndUpdate(customerId, {
      $inc: { communication_count: 1 },
      $set: { last_communication_date: communication.communication_date }
    }, { new: true });

    res.status(201).json({
      communication,
      customer: { _id: updated._id, communication_count: updated.communication_count, last_communication_date: updated.last_communication_date }
    });
  } catch (error) {
    console.error('Log communication error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCommunications = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { type, dateFrom, dateTo, page, limit } = req.query;
    const customer = await Customer.findOne({ _id: customerId, isDeleted: { $ne: true } });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const filter = { customer: customerId };
    if (type) filter.type = type;
    if (dateFrom || dateTo) {
      filter.communication_date = {};
      if (dateFrom) filter.communication_date.$gte = new Date(dateFrom);
      if (dateTo) filter.communication_date.$lte = new Date(dateTo);
    }

    const total = await Communication.countDocuments(filter);
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));

    const communications = await Communication.find(filter)
      .populate('created_by', 'name email role')
      .sort({ communication_date: -1, created_at: -1 })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize);

    res.json({
      communications,
      count: communications.length,
      total,
      page: currentPage,
      pages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('Get communications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCommunicationStats = async (req, res) => {
  try {
    const { customerId } = req.params;
    const customer = await Customer.findOne({ _id: customerId, isDeleted: { $ne: true } });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const breakdown = await Communication.aggregate([
      { $match: { customer: customer._id } },
      { $group: { _id: { type: '$type', name: '$typeName', icon: '$typeIcon' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      total: customer.communication_count || 0,
      last_date: customer.last_communication_date || null,
      breakdown: breakdown.map(b => ({
        type: b._id.type, name: b._id.name, icon: b._id.icon, count: b.count
      }))
    });
  } catch (error) {
    console.error('Get communication stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.incrementCounter = async (req, res) => {
  try {
    const { customerId } = req.params;
    const customer = await Customer.findOneAndUpdate(
      { _id: customerId, isDeleted: { $ne: true } },
      { $inc: { communication_count: 1 }, $set: { last_communication_date: new Date() } },
      { new: true }
    );
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ customer: { _id: customer._id, communication_count: customer.communication_count, last_communication_date: customer.last_communication_date } });
  } catch (error) {
    console.error('Increment communication counter error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};