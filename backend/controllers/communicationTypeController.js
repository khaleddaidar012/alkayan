const CommunicationType = require('../models/CommunicationType');
const Communication = require('../models/Communication');
const { validationResult } = require('express-validator');

exports.getTypes = async (req, res) => {
  try {
    const types = await CommunicationType.find().sort({ sort_order: 1, createdAt: 1 });
    res.json({ types });
  } catch (error) {
    console.error('Get communication types error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getType = async (req, res) => {
  try {
    const type = await CommunicationType.findById(req.params.id);
    if (!type) return res.status(404).json({ message: 'Communication type not found' });
    res.json({ type });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createType = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    const { name, icon, sort_order } = req.body;
    const type = await CommunicationType.create({
      name: String(name).trim(),
      icon: icon ? String(icon).trim().slice(0, 10) : '💬',
      is_system: false,
      sort_order: Number(sort_order) || 0
    });
    res.status(201).json({ type });
  } catch (error) {
    console.error('Create communication type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateType = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    const type = await CommunicationType.findById(req.params.id);
    if (!type) return res.status(404).json({ message: 'Communication type not found' });
    if (type.is_system) return res.status(400).json({ message: 'System types cannot be edited' });
    const { name, icon, sort_order } = req.body;
    if (name !== undefined) type.name = String(name).trim();
    if (icon !== undefined) type.icon = String(icon).trim().slice(0, 10);
    if (sort_order !== undefined) type.sort_order = Number(sort_order) || 0;
    await type.save();
    res.json({ type });
  } catch (error) {
    console.error('Update communication type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteType = async (req, res) => {
  try {
    const type = await CommunicationType.findById(req.params.id);
    if (!type) return res.status(404).json({ message: 'Communication type not found' });
    if (type.is_system) return res.status(400).json({ message: 'System types cannot be deleted' });
    const inUse = await Communication.exists({ type: type._id });
    if (inUse) return res.status(400).json({ message: 'Cannot delete: communication history uses this type' });
    await type.deleteOne();
    res.json({ message: 'Communication type deleted' });
  } catch (error) {
    console.error('Delete communication type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};