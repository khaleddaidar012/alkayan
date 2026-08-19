// Tasks Controller - Backend
const Task = require('../models/Task');
const Customer = require('../models/Customer');
const Campaign = require('../models/Campaign');
const Course = require('../models/Course');
const User = require('../models/User');
const { validationResult } = require('express-validator');

exports.getTasks = async (req, res) => {
  try {
    const { status, assignedTo, deadline, search } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (deadline) {
      filter.deadline = {};
      if (deadline === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filter.deadline.$gte = today;
      } else if (deadline === 'thisWeek') {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        weekStart.setHours(0, 0, 0, 0);
        filter.deadline.$gte = weekStart;
      } else if (deadline === 'thisMonth') {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        filter.deadline.$gte = monthStart;
      }
    }
    
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      filter.$or = [{ title: searchRegex }, { description: searchRegex }];
    }
    
    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('relatedClients', 'name phone')
      .populate('relatedCampaign', 'name')
      .populate('relatedProgram', 'name')
      .sort({ createdAt: -1 });
    
    res.json({ tasks, count: tasks.length });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('relatedClients', 'name phone')
      .populate('relatedCampaign', 'name')
      .populate('relatedProgram', 'name');
    
    if (!task) return res.status(404).json({ message: 'Task not found' });
    
    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createTask = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    
    const { title, description, assignedTo, deadline, type, priority, relatedClients, relatedCampaign, relatedProgram } = req.body;
    
    const clientsArray = Array.isArray(relatedClients) ? relatedClients : [];
    const campaignId = relatedCampaign || null;
    const programId = relatedProgram || null;
    
    if (!campaignId && !programId && clientsArray.length === 0) {
      return res.status(400).json({ message: 'At least one client, campaign, or program must be specified' });
    }
    
    const taskData = {
      title,
      description: description || '',
      assignedTo,
      createdBy: req.user._id,
      deadline: new Date(deadline),
      type: type || 'general',
      priority: priority || 'medium',
      status: 'pending',
      proofType: null,
      proofContent: '',
      relatedClients: clientsArray,
      relatedCampaign: campaignId,
      relatedProgram: programId
    };
    
    const task = await Task.create(taskData);
    
    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('relatedClients', 'name phone')
      .populate('relatedCampaign', 'name')
      .populate('relatedProgram', 'name');
    
    res.status(201).json({ task: populated });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    
    const { title, status, deadline, proofType, proofContent } = req.body;
    
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (status !== undefined) updateData.status = status;
    if (deadline !== undefined) updateData.deadline = new Date(deadline);
    if (proofType !== undefined) updateData.proofType = proofType;
    if (proofContent !== undefined) updateData.proofContent = proofContent;
    
    const task = await Task.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true, runValidators: true })
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('relatedClients', 'name phone')
      .populate('relatedCampaign', 'name')
      .populate('relatedProgram', 'name');
    
    if (!task) return res.status(404).json({ message: 'Task not found' });
    
    res.json({ task });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const { status, proofType, proofContent } = req.body;
    
    if (!status) return res.status(400).json({ message: 'Status is required' });
    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    
    const updateData = { status };
    if (proofType !== undefined) updateData.proofType = proofType;
    if (proofContent !== undefined) updateData.proofContent = proofContent;
    
    const task = await Task.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true, runValidators: true })
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('relatedClients', 'name phone')
      .populate('relatedCampaign', 'name')
      .populate('relatedProgram', 'name');
    
    if (!task) return res.status(404).json({ message: 'Task not found' });
    
    res.json({ task });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
