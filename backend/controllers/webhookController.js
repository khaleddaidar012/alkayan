const Customer = require('../models/Customer');
const WebhookLog = require('../models/WebhookLog');
const CustomerStatus = require('../models/CustomerStatus');
const { parseWhatsAppMessage } = require('../utils/messageParser');
const { detectCountryFromPhone, normalizePhone } = require('../utils/countryDetection');

async function findOrCreateStatus(statusName) {
  const name = statusName || 'New';
  let status = await CustomerStatus.findOne({ name, isDeleted: { $ne: true } });
  if (!status) {
    const existing = await CustomerStatus.findOne({ is_system: true }).sort({ sort_order: 1 });
    return existing || null;
  }
  return status;
}

async function processWebhookPayload(payload, source) {
  const startedAt = Date.now();
  const message = payload && payload.message;
  const meta = (payload && payload.meta) || {};
  const parsed = parseWhatsAppMessage(message);
  if (!parsed) {
    await WebhookLog.create({
      source,
      payload,
      status: 'error',
      action: 'failed',
      error_message: 'Invalid message format. Expected: Name | Phone | Program | Status',
      processing_time_ms: Date.now() - startedAt
    });
    return { success: false, error: 'Invalid message format. Expected: Name | Phone | Program | Status' };
  }

  try {
    const phoneDigits = parsed.phone;
    const country = parsed.country;
    let customer = await Customer.findOne({
      whatsapp_number: phoneDigits,
      isDeleted: { $ne: true }
    });

    let action = 'created';
    if (!customer) {
      const status = await findOrCreateStatus(parsed.status);
      customer = await Customer.create({
        name: parsed.name,
        name_ar: parsed.name,
        phone: parsed.phone,
        whatsapp_number: phoneDigits,
        whatsapp: phoneDigits,
        country,
        program_name: parsed.program,
        program: parsed.program,
        source: 'whatsapp_webhook',
        status_id: status ? status._id : null,
        status: parsed.status === 'Subscribed' ? 'subscribed' : 'potential',
        last_communication_date: new Date()
      });
    } else {
      let changed = false;
      const currentName = customer.name_ar || customer.name;
      if (!currentName) {
        customer.name = parsed.name;
        customer.name_ar = parsed.name;
        changed = true;
      }
      if (parsed.program && customer.program_name !== parsed.program) {
        customer.program_name = parsed.program;
        customer.program = parsed.program;
        changed = true;
      }
      if (parsed.status && parsed.status !== 'New') {
        const status = await findOrCreateStatus(parsed.status);
        if (status && String(customer.status_id || '') !== String(status._id)) {
          customer.status_id = status._id;
          if (parsed.status === 'Subscribed') customer.status = 'subscribed';
          changed = true;
        }
      }
      customer.last_communication_date = new Date();
      await customer.save();
      action = changed ? 'updated' : 'no_change';
    }

    await WebhookLog.create({
      source,
      payload,
      status: 'success',
      action,
      customer: customer._id,
      processing_time_ms: Date.now() - startedAt
    });

    return { success: true, customer_id: customer._id, action };
  } catch (error) {
    console.error('Webhook processing error:', error);
    await WebhookLog.create({
      source,
      payload,
      status: 'error',
      action: 'failed',
      error_message: error.message || 'Server error',
      processing_time_ms: Date.now() - startedAt
    });
    return { success: false, error: error.message || 'Server error' };
  }
}

exports.handleWebhook = async (req, res) => {
  const result = await processWebhookPayload(req.body, 'n8n');
  if (!result.success) {
    if (result.error === 'Invalid message format. Expected: Name | Phone | Program | Status') {
      return res.status(400).json(result);
    }
    return res.status(500).json(result);
  }
  res.json(result);
};

exports.devWebhookTest = async (req, res) => {
  const result = await processWebhookPayload(req.body, 'dev');
  res.json(result);
};

exports.getWebhookLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.customer) filter.customer = req.query.customer;
    if (req.query.action) filter.action = req.query.action;
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) filter.createdAt.$lte = new Date(req.query.dateTo);
    }
    const total = await WebhookLog.countDocuments(filter);
    const logs = await WebhookLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('customer', 'name name_ar phone');
    res.json({
      logs: logs.map(l => ({
        _id: l._id,
        source: l.source,
        payload: l.payload,
        status: l.status,
        action: l.action,
        error_message: l.error_message,
        customer: l.customer ? { _id: l.customer._id, name: l.customer.name_ar || l.customer.name, phone: l.customer.phone } : null,
        processing_time_ms: l.processing_time_ms,
        created_at: l.createdAt,
        reprocessed_at: l.reprocessed_at
      })),
      total,
      page,
      limit
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.reprocessLog = async (req, res) => {
  try {
    const log = await WebhookLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log not found' });
    const result = await processWebhookPayload(log.payload, log.source);
    if (result.success) {
      log.status = 'success';
      log.action = result.action;
      log.error_message = '';
      log.customer = result.customer_id;
      log.reprocessed_at = new Date();
      await log.save();
      res.json({ success: true, ...result });
    } else {
      log.status = 'error';
      log.action = 'failed';
      log.error_message = result.error || 'Reprocess failed';
      await log.save();
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};