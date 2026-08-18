const mongoose = require('mongoose');

const customerStatusHistorySchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  from_status: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerStatus', default: null },
  to_status: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerStatus', required: true },
  changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  changed_at: { type: Date, default: Date.now },
  notes: { type: String, default: '', trim: true, maxlength: 500 }
}, { timestamps: true });

customerStatusHistorySchema.index({ customer: 1, changed_at: -1 });

module.exports = mongoose.model('CustomerStatusHistory', customerStatusHistorySchema);