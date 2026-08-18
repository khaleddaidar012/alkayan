const CustomerStatus = require('../models/CustomerStatus');
const CustomerStatusHistory = require('../models/CustomerStatusHistory');
const Customer = require('../models/Customer');
const { validationResult } = require('express-validator');

exports.getStatuses = async (req, res) => {
  try {
    const statuses = await CustomerStatus.find({ isDeleted: { $ne: true } }).sort({ sort_order: 1, createdAt: 1 });
    const ids = statuses.map(s => s._id);
    const usage = await Customer.aggregate([
      { $match: { status_id: { $in: ids }, isDeleted: { $ne: true } } },
      { $group: { _id: '$status_id', count: { $sum: 1 } } }
    ]);
    const usageMap = {};
    for (const row of usage) usageMap[String(row._id)] = row.count;
    res.json({ statuses: statuses.map(s => {
      const o = s.toObject();
      o.used_by = usageMap[String(s._id)] || 0;
      return o;
    }) });
  } catch (error) {
    console.error('Get customer statuses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    const { name, color, description, sort_order } = req.body;
    const existing = await CustomerStatus.exists({ name: String(name).trim(), isDeleted: { $ne: true } });
    if (existing) return res.status(400).json({ message: 'Status name already exists' });
    const status = await CustomerStatus.create({
      name: String(name).trim(),
      color: String(color || '#6B7280'),
      description: description ? String(description).trim().slice(0, 300) : '',
      is_system: false,
      sort_order: Number(sort_order) || 0
    });
    res.status(201).json({ status });
  } catch (error) {
    console.error('Create customer status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    const status = await CustomerStatus.findById(req.params.id);
    if (!status || status.isDeleted) return res.status(404).json({ message: 'Status not found' });
    if (status.is_system) return res.status(400).json({ message: 'System statuses cannot be edited' });
    const { name, color, description, sort_order } = req.body;
    if (name !== undefined) {
      const dup = await CustomerStatus.exists({ name: String(name).trim(), _id: { $ne: status._id }, isDeleted: { $ne: true } });
      if (dup) return res.status(400).json({ message: 'Status name already exists' });
      status.name = String(name).trim();
    }
    if (color !== undefined) status.color = String(color);
    if (description !== undefined) status.description = String(description).trim().slice(0, 300);
    if (sort_order !== undefined) status.sort_order = Number(sort_order) || 0;
    await status.save();
    res.json({ status });
  } catch (error) {
    console.error('Update customer status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteStatus = async (req, res) => {
  try {
    const status = await CustomerStatus.findById(req.params.id);
    if (!status || status.isDeleted) return res.status(404).json({ message: 'Status not found' });
    if (status.is_system) return res.status(400).json({ message: 'System statuses cannot be deleted' });
    const inUse = await Customer.exists({ status_id: status._id, isDeleted: { $ne: true } });
    if (inUse) return res.status(400).json({ message: 'Cannot delete: customers currently use this status' });
    status.isDeleted = true;
    status.deletedAt = new Date();
    await status.save();
    res.json({ message: 'Status deleted' });
  } catch (error) {
    console.error('Delete customer status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.reorderStatuses = async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ message: 'order must be an array of status ids' });
    await Promise.all(order.map((id, idx) => CustomerStatus.updateOne({ _id: id }, { sort_order: idx + 1 })));
    const statuses = await CustomerStatus.find({ isDeleted: { $ne: true } }).sort({ sort_order: 1, createdAt: 1 });
    res.json({ statuses });
  } catch (error) {
    console.error('Reorder customer statuses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateCustomerStatus = async (req, res) => {
  try {
    const cid = req.params.customerId || req.params.id;
    const customer = await Customer.findOne({ _id: cid, isDeleted: { $ne: true } });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const { status_id, notes } = req.body;
    if (!status_id) return res.status(400).json({ message: 'status_id is required' });
    const toStatus = await CustomerStatus.findOne({ _id: status_id, isDeleted: { $ne: true } });
    if (!toStatus) return res.status(400).json({ message: 'Invalid status' });
    const fromStatusId = customer.status_id || null;
    if (fromStatusId && String(fromStatusId) === String(toStatus._id)) {
      return res.json({ customer, message: 'Status unchanged' });
    }
    customer.status_id = toStatus._id;
    await customer.save();
    await CustomerStatusHistory.create({
      customer: customer._id,
      from_status: fromStatusId,
      to_status: toStatus._id,
      changed_by: req.user ? req.user._id : null,
      changed_at: new Date(),
      notes: notes ? String(notes).trim().slice(0, 500) : ''
    });
    res.json({ customer });
  } catch (error) {
    console.error('Update customer status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getStatusHistory = async (req, res) => {
  try {
    const cid = req.params.customerId || req.params.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const customer = await Customer.findOne({ _id: cid, isDeleted: { $ne: true } });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const total = await CustomerStatusHistory.countDocuments({ customer: customer._id });
    const history = await CustomerStatusHistory.find({ customer: customer._id })
      .sort({ changed_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('from_status', 'name color')
      .populate('to_status', 'name color')
      .populate('changed_by', 'name');
    res.json({
      history: history.map(h => ({
        _id: h._id,
        from_status: h.from_status ? { _id: h.from_status._id, name: h.from_status.name, color: h.from_status.color } : null,
        to_status: h.to_status ? { _id: h.to_status._id, name: h.to_status.name, color: h.to_status.color } : null,
        changed_by_name: h.changed_by ? h.changed_by.name : 'Unknown',
        changed_at: h.changed_at,
        notes: h.notes || ''
      })),
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Get status history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};