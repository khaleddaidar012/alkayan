const mongoose = require('mongoose');

const communicationSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  type: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunicationType', default: null },
  typeName: { type: String, default: '' },
  typeIcon: { type: String, default: '' },
  communication_date: { type: Date, default: Date.now },
  notes: { type: String, default: '', maxlength: 1000 },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

communicationSchema.index({ customer: 1, communication_date: -1, created_at: -1 });
communicationSchema.index({ type: 1 });

module.exports = mongoose.model('Communication', communicationSchema);