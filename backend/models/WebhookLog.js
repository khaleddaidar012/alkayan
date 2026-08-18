const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema({
  source: { type: String, enum: ['n8n', 'dev'], default: 'n8n' },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['success', 'error'], default: 'error' },
  action: { type: String, enum: ['created', 'updated', 'no_change', 'failed'], default: 'failed' },
  error_message: { type: String, default: '' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  processing_time_ms: { type: Number, default: 0 },
  reprocessed_at: { type: Date, default: null }
}, { timestamps: true });

webhookLogSchema.index({ createdAt: -1 });
webhookLogSchema.index({ customer: 1 });
webhookLogSchema.index({ status: 1 });

module.exports = mongoose.model('WebhookLog', webhookLogSchema);