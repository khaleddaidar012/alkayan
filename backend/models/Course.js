const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Program name is required'],
    trim: true
  },
  title: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },
  duration: {
    type: String,
    default: ''
  },
  instructor: {
    type: String,
    default: ''
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  capacity: {
    type: Number,
    default: 30,
    min: 1
  },
  maxStudents: {
    type: Number,
    default: 30
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'draft'],
    default: 'draft'
  },
  image: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

courseSchema.pre('save', function (next) {
  if (!this.title) this.title = this.name;
  if (!this.name) this.name = this.title;
  if (!this.maxStudents) this.maxStudents = this.capacity;
  if (!this.capacity) this.capacity = this.maxStudents;
  next();
});

module.exports = mongoose.model('Course', courseSchema);
