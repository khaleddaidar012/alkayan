const PaymentMethod = require('../models/PaymentMethod');
const Payment = require('../models/Payment');
const { validationResult } = require('express-validator');

exports.getMethods = async (req, res) => {
  try {
    const { country, includeInactive } = req.query;
    const filter = {};
    if (country && country !== 'all') {
      filter.$or = [{ country }, { country: 'global' }];
    }
    if (includeInactive !== 'true') filter.is_active = true;
    const methods = await PaymentMethod.find(filter).sort({ sort_order: 1, createdAt: 1 });
    res.json({ methods });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMethod = async (req, res) => {
  try {
    const method = await PaymentMethod.findById(req.params.id);
    if (!method) return res.status(404).json({ message: 'Payment method not found' });
    res.json({ method });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createMethod = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    const { name, country, is_active, sort_order } = req.body;
    const method = await PaymentMethod.create({
      name: String(name).trim(),
      country: country || 'global',
      is_active: is_active === undefined ? true : Boolean(is_active),
      sort_order: Number(sort_order) || 0
    });
    res.status(201).json({ method });
  } catch (error) {
    console.error('Create payment method error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateMethod = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    const method = await PaymentMethod.findById(req.params.id);
    if (!method) return res.status(404).json({ message: 'Payment method not found' });
    const { name, country, is_active, sort_order } = req.body;
    if (name !== undefined) method.name = String(name).trim();
    if (country !== undefined) method.country = country;
    if (is_active !== undefined) method.is_active = Boolean(is_active);
    if (sort_order !== undefined) method.sort_order = Number(sort_order) || 0;
    await method.save();
    res.json({ method });
  } catch (error) {
    console.error('Update payment method error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deactivateMethod = async (req, res) => {
  try {
    const method = await PaymentMethod.findById(req.params.id);
    if (!method) return res.status(404).json({ message: 'Payment method not found' });
    const inUse = await Payment.exists({ method: method._id });
    if (inUse) {
      method.is_active = false;
      await method.save();
      return res.json({ method, message: 'Payment method deactivated (has associated payments)' });
    }
    await method.deleteOne();
    res.json({ message: 'Payment method deleted', method });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};