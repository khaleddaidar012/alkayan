const mongoose = require('mongoose');

const customerStatusSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Status name is required'], trim: true, maxlength: 80 },
  color: {
    type: String,
    required: [true, 'Status color is required'],
    match: [/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex like #RRGGBB'],
    default: '#6B7280'
  },
  is_system: { type: Boolean, default: false },
  sort_order: { type: Number, default: 0, min: 0 },
  description: { type: String, default: '', trim: true, maxlength: 300 },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

customerStatusSchema.index({ sort_order: 1, createdAt: 1 });
customerStatusSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } });

module.exports = mongoose.model('CustomerStatus', customerStatusSchema);