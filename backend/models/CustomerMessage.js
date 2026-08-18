const mongoose = require('mongoose');

const customerMessageSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  sender_type: { type: String, enum: ['customer', 'employee'], required: true },
  content: { type: String, required: [true, 'Message content is required'], trim: true, maxlength: 2000 },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

customerMessageSchema.index({ customer: 1, created_at: -1 });
customerMessageSchema.index({ sender_type: 1 });

module.exports = mongoose.model('CustomerMessage', customerMessageSchema);