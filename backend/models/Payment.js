const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  amount: { type: Number, required: true, min: 0.01 },
  currency: { type: String, required: true, uppercase: true, trim: true, maxlength: 3, default: 'USD' },
  direction: { type: String, enum: ['in', 'out'], required: true },
  method: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentMethod', default: null },
  methodName: { type: String, default: '' },
  receipt_url: { type: String, default: '' },
  notes: { type: String, default: '', maxlength: 500 },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

paymentSchema.index({ customer: 1, created_at: -1 });
paymentSchema.index({ direction: 1 });
paymentSchema.index({ method: 1 });

paymentSchema.pre('save', function (next) {
  this.amount = Math.round(Number(this.amount) * 100) / 100;
  next();
});

paymentSchema.statics.getSummary = async function (customerId) {
  const rows = await this.aggregate([
    { $match: { customer: new mongoose.Types.ObjectId(customerId) } },
    { $group: {
      _id: '$direction',
      total: { $sum: '$amount' },
      count: { $sum: 1 }
    } }
  ]);
  const summary = { total_in: 0, total_out: 0, balance: 0, count_in: 0, count_out: 0 };
  for (const row of rows) {
    if (row._id === 'in') { summary.total_in = row.total; summary.count_in = row.count; }
    if (row._id === 'out') { summary.total_out = row.total; summary.count_out = row.count; }
  }
  summary.balance = summary.total_in - summary.total_out;
  return summary;
};

module.exports = mongoose.model('Payment', paymentSchema);