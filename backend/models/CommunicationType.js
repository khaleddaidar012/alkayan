const mongoose = require('mongoose');

const communicationTypeSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Type name is required'], trim: true, maxlength: 80 },
  icon: { type: String, default: '💬', maxlength: 10 },
  is_system: { type: Boolean, default: false },
  sort_order: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

communicationTypeSchema.index({ sort_order: 1, createdAt: 1 });

module.exports = mongoose.model('CommunicationType', communicationTypeSchema);