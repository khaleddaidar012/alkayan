const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Campaign name is required'],
    trim: true
  },
  program: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Program is required']
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'scheduled', 'cancelled'],
    default: 'active'
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  budget: {
    type: Number,
    default: 0,
    min: 0
  },
  leadsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  registeredCustomers: {
    type: Number,
    default: 0,
    min: 0
  },
  conversionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  assignedEmployees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  customers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  }],
  description: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Campaign', campaignSchema);