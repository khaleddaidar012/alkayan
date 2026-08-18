const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { verifyWebhookAuth } = require('../utils/webhookAuth');
const { protect, authorize } = require('../middleware/auth');

const rateLimit = (() => {
  const buckets = new Map();
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const bucket = buckets.get(ip) || { tokens: 100, last: now };
    if (now - bucket.last > 60000) {
      bucket.tokens = 100;
      bucket.last = now;
    }
    if (bucket.tokens <= 0) {
      return res.status(429).json({ success: false, error: 'Too many requests' });
    }
    bucket.tokens -= 1;
    buckets.set(ip, bucket);
    next();
  };
})();

const webhookAuth = (req, res, next) => {
  const mode = process.env.WEBHOOK_AUTH_MODE || 'bearer';
  if (mode === 'none') return next();
  if (verifyWebhookAuth(req)) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized' });
};

router.post('/whatsapp', rateLimit, webhookAuth, webhookController.handleWebhook);
router.post('/n8n', rateLimit, webhookAuth, webhookController.handleWebhook);

router.get('/logs', protect, webhookController.getWebhookLogs);
router.post('/logs/:id/reprocess', protect, webhookController.reprocessLog);

router.post('/dev/webhook-test', webhookController.devWebhookTest);

module.exports = router;