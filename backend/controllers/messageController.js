const CustomerMessage = require('../models/CustomerMessage');
const Customer = require('../models/Customer');
const { validationResult } = require('express-validator');

exports.addMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    const { customerId } = req.params;
    const customer = await Customer.findOne({ _id: customerId, isDeleted: { $ne: true } });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const { sender_type, content } = req.body;
    const message = await CustomerMessage.create({
      customer: customerId,
      sender_type,
      content: String(content).trim(),
      created_by: req.user ? req.user._id : null
    });

    const populated = await CustomerMessage.populate(message, { path: 'created_by', select: 'name email role' });
    res.status(201).json({ message: populated });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { page, limit, sender } = req.query;
    const customer = await Customer.findOne({ _id: customerId, isDeleted: { $ne: true } });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const filter = { customer: customerId };
    if (sender === 'customer' || sender === 'employee') filter.sender_type = sender;

    const total = await CustomerMessage.countDocuments(filter);
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));

    const messages = await CustomerMessage.find(filter)
      .populate('created_by', 'name email role')
      .sort({ created_at: -1 })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize);

    res.json({
      messages,
      count: messages.length,
      total,
      page: currentPage,
      pages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getLatestMessages = async (req, res) => {
  try {
    const { customerId } = req.params;
    const customer = await Customer.findOne({ _id: customerId, isDeleted: { $ne: true } });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const [customerMsg, employeeMsg] = await Promise.all([
      CustomerMessage.findOne({ customer: customerId, sender_type: 'customer' }).sort({ created_at: -1 }),
      CustomerMessage.findOne({ customer: customerId, sender_type: 'employee' }).sort({ created_at: -1 })
    ]);
    const latest = await CustomerMessage.findOne({ customer: customerId }).sort({ created_at: -1 });

    res.json({
      customer: customerMsg,
      employee: employeeMsg,
      latest: latest,
      has_messages: !!(customerMsg || employeeMsg)
    });
  } catch (error) {
    console.error('Get latest messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};