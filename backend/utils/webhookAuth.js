const crypto = require('crypto');

function verifyBearerToken(req) {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!secret) return false;
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}

function verifyHmacSignature(req) {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!secret) return false;
  const signature = req.headers['x-hub-signature-256'] || req.headers['x-signature'];
  if (!signature) return false;
  const rawBody = req.rawBody || JSON.stringify(req.body || {});
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    const a = Buffer.from(String(signature).replace(/^sha256=/, 'sha256='));
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function verifyWebhookAuth(req) {
  const mode = process.env.WEBHOOK_AUTH_MODE || 'bearer';
  if (mode === 'hmac') return verifyHmacSignature(req);
  if (mode === 'both') return verifyBearerToken(req) || verifyHmacSignature(req);
  return verifyBearerToken(req);
}

module.exports = { verifyWebhookAuth, verifyBearerToken, verifyHmacSignature };