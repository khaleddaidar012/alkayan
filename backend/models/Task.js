const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Assigned user is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  },
  proofType: {
    type: String,
    enum: ['text', 'image'],
    default: null
  },
  proofContent: {
    type: String,
    default: ''
  },
  relatedClients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  }],
  relatedCampaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    default: null
  },
  relatedProgram: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
  },
  deadline: {
    type: Date,
    required: [true, 'Deadline is required']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Task', taskSchema);
