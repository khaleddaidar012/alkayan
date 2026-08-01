const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Goal title is required'],
    trim: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: [true, 'Period is required']
  },
  completed: {
    type: Boolean,
    default: false
  },
  checklist: [{
    type: String,
    required: [true, 'Checklist item is required'],
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Goal', goalSchema);
