// Goals Controller - Backend
const Goal = require('../models/Goal');
const User = require('../models/User');
const { validationResult } = require('express-validator');

exports.getGoals = async (req, res) => {
  try {
    const { employee, period, completed } = req.query;
    const filter = {};
    
    if (employee) filter.employee = employee;
    if (period) filter.period = period;
    if (completed !== undefined) filter.completed = completed === 'true';
    
    const goals = await Goal.find(filter)
      .populate('employee', 'name email role')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ goals, count: goals.length });
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id)
      .populate('employee', 'name email role')
      .populate('createdBy', 'name email');
    
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    
    res.json({ goal });
  } catch (error) {
    console.error('Get goal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createGoal = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    
    const { title, employee, period, description, checklist } = req.body;
    
    const checklistArray = Array.isArray(checklist) ? checklist : [];
    
    const goalData = {
      title,
      employee,
      createdBy: req.user._id,
      period,
      completed: false,
      checklist: checklistArray
    };
    
    const goal = await Goal.create(goalData);
    
    const populated = await Goal.findById(goal._id)
      .populate('employee', 'name email role')
      .populate('createdBy', 'name email');
    
    res.status(201).json({ goal: populated });
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateGoal = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    
    const { title, period, completed, checklist } = req.body;
    
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (period !== undefined) updateData.period = period;
    if (completed !== undefined) updateData.completed = completed;
    if (checklist !== undefined) updateData.checklist = checklist;
    
    const goal = await Goal.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true, runValidators: true })
      .populate('employee', 'name email role')
      .populate('createdBy', 'name email');
    
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    
    res.json({ goal });
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findByIdAndDelete(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
