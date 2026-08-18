const { normalizePhone, detectCountryFromPhone } = require('./countryDetection');

const STATUS_MAP = {
  'مشترك': 'Subscribed',
  'مهتم': 'Interested',
  'غير مهتم': 'Not Interested',
  'ملغي': 'Cancelled',
  'ملغى': 'Cancelled',
  'جديد': 'New',
  'تم التواصل': 'Contacted',
  'تم التحويل للهاتف': 'Transferred to Phone',
  'subscribed': 'Subscribed',
  'interested': 'Interested',
  'not interested': 'Not Interested',
  'cancelled': 'Cancelled',
  'new': 'New',
  'contacted': 'Contacted',
  'transferred to phone': 'Transferred to Phone'
};

function mapStatus(statusText) {
  const key = String(statusText || '').trim();
  if (STATUS_MAP[key]) return { status: STATUS_MAP[key], matched: true };
  const lower = key.toLowerCase();
  if (STATUS_MAP[lower]) return { status: STATUS_MAP[lower], matched: true };
  return { status: 'New', matched: false };
}

function parseWhatsAppMessage(text) {
  if (!text || typeof text !== 'string') return null;
  const parts = text.split('|').map(p => p.trim()).filter(Boolean);
  if (parts.length < 4) return null;

  const name = parts[0];
  const phoneRaw = parts[1];
  const program = parts[2] || '';
  const statusText = parts[3] || '';

  if (!name || !phoneRaw) return null;

  const digits = normalizePhone(phoneRaw);
  if (!digits) return null;

  const mapped = mapStatus(statusText);

  return {
    name,
    phone: digits,
    whatsapp_number: digits,
    country: detectCountryFromPhone(digits),
    program: program,
    status_text: statusText,
    status: mapped.status,
    status_matched: mapped.matched
  };
}

module.exports = { parseWhatsAppMessage, mapStatus, STATUS_MAP };