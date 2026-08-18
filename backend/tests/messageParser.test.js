const { test } = require('node:test');
const assert = require('node:assert');
const { parseWhatsAppMessage, mapStatus } = require('../utils/messageParser');

test('parseWhatsAppMessage: valid Arabic format', () => {
  const p = parseWhatsAppMessage('خالد هشام | 01092919124 | برنامج المعلين | مشترك');
  assert.ok(p);
  assert.strictEqual(p.name, 'خالد هشام');
  assert.strictEqual(p.phone, '201092919124');
  assert.strictEqual(p.country, 'egypt');
  assert.strictEqual(p.program, 'برنامج المعلين');
  assert.strictEqual(p.status, 'Subscribed');
  assert.strictEqual(p.status_matched, true);
});

test('parseWhatsAppMessage: handles extra spaces', () => {
  const p = parseWhatsAppMessage('  أحمد علي   |  01012345678  |  برنامج المعلين  |  مهتم  ');
  assert.ok(p);
  assert.strictEqual(p.name, 'أحمد علي');
  assert.strictEqual(p.phone, '201012345678');
  assert.strictEqual(p.status, 'Interested');
});

test('parseWhatsAppMessage: phone normalization +20 and 0020', () => {
  assert.strictEqual(parseWhatsAppMessage('a | +20 10 1234 5678 | p | مهتم').phone, '201012345678');
  assert.strictEqual(parseWhatsAppMessage('a | 00201122334455 | p | مهتم').phone, '201122334455');
  assert.strictEqual(parseWhatsAppMessage('a | 0551234567 | p | مهتم').country, 'saudi_arabia');
  assert.strictEqual(parseWhatsAppMessage('a | 091234567 | p | مهتم').country, 'oman');
  assert.strictEqual(parseWhatsAppMessage('a | 0912345678 | p | مهتم').country, 'libya');
});

test('parseWhatsAppMessage: invalid formats return null', () => {
  assert.strictEqual(parseWhatsAppMessage(null), null);
  assert.strictEqual(parseWhatsAppMessage(''), null);
  assert.strictEqual(parseWhatsAppMessage('just a string'), null);
  assert.strictEqual(parseWhatsAppMessage('Name | Phone | Program'), null);
  assert.strictEqual(parseWhatsAppMessage(' | | | '), null);
});

test('mapStatus: all Arabic variants', () => {
  assert.strictEqual(mapStatus('مشترك').status, 'Subscribed');
  assert.strictEqual(mapStatus('مهتم').status, 'Interested');
  assert.strictEqual(mapStatus('غير مهتم').status, 'Not Interested');
  assert.strictEqual(mapStatus('ملغي').status, 'Cancelled');
  assert.strictEqual(mapStatus('ملغى').status, 'Cancelled');
  assert.strictEqual(mapStatus('جديد').status, 'New');
  assert.strictEqual(mapStatus('تم التواصل').status, 'Contacted');
  assert.strictEqual(mapStatus('تم التحويل للهاتف').status, 'Transferred to Phone');
});

test('mapStatus: unknown defaults to New with matched=false', () => {
  const r = mapStatus('مشترك شوية');
  assert.strictEqual(r.status, 'New');
  assert.strictEqual(r.matched, false);
});

test('parseWhatsAppMessage: stores program and status_text', () => {
  const p = parseWhatsAppMessage('سارة | +218911234567 | برنامج التصميم | ملغي');
  assert.ok(p);
  assert.strictEqual(p.program, 'برنامج التصميم');
  assert.strictEqual(p.status_text, 'ملغي');
  assert.strictEqual(p.country, 'libya');
});