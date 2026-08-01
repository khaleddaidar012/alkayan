const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['revenue', 'enrollment', 'performance', 'tasks', 'custom'],
    required: [true, 'Report type is required']
  },
  title: {
    type: String,
    required: [true, 'Report title is required'],
    trim: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Report data is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dateRange: {
    start: Date,
    end: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);
