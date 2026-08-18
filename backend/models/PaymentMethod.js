const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Method name is required'], trim: true, maxlength: 80 },
  country: {
    type: String,
    enum: ['egypt', 'saudi_arabia', 'oman', 'libya', 'other', 'global'],
    default: 'global'
  },
  is_active: { type: Boolean, default: true },
  sort_order: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

paymentMethodSchema.index({ country: 1, is_active: 1, sort_order: 1 });

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);