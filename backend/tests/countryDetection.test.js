const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizePhone,
  detectCountryFromPhone,
  formatInternationalPhone,
  COUNTRY_KEYS
} = require('../utils/countryDetection');
const { isValidPhone } = require('../validators/customerValidator');

test('normalizePhone keeps international + prefix', () => {
  assert.strictEqual(normalizePhone('+201092919124'), '201092919124');
});

test('normalizePhone converts 00 prefix', () => {
  assert.strictEqual(normalizePhone('00201092919124'), '201092919124');
});

test('normalizePhone converts Egyptian local format', () => {
  assert.strictEqual(normalizePhone('01092919124'), '201092919124');
});

test('normalizePhone strips spaces, dashes and parentheses', () => {
  assert.strictEqual(normalizePhone('+20 (109) 291-9124'), '201092919124');
});

test('normalizePhone converts Saudi local format', () => {
  assert.strictEqual(normalizePhone('0551234567'), '966551234567');
});

test('normalizePhone converts Oman local format', () => {
  assert.strictEqual(normalizePhone('091234567'), '96891234567');
});

test('normalizePhone converts Libyan local format', () => {
  assert.strictEqual(normalizePhone('0911234567'), '218911234567');
});

test('normalizePhone returns empty for empty input', () => {
  assert.strictEqual(normalizePhone(''), '');
  assert.strictEqual(normalizePhone(null), '');
  assert.strictEqual(normalizePhone(undefined), '');
});

test('detectCountryFromPhone: Egypt', () => {
  assert.strictEqual(detectCountryFromPhone('+201092919124'), 'egypt');
  assert.strictEqual(detectCountryFromPhone('00201092919124'), 'egypt');
  assert.strictEqual(detectCountryFromPhone('01092919124'), 'egypt');
});

test('detectCountryFromPhone: Saudi Arabia', () => {
  assert.strictEqual(detectCountryFromPhone('+966551234567'), 'saudi_arabia');
  assert.strictEqual(detectCountryFromPhone('0551234567'), 'saudi_arabia');
});

test('detectCountryFromPhone: Oman', () => {
  assert.strictEqual(detectCountryFromPhone('+96891234567'), 'oman');
  assert.strictEqual(detectCountryFromPhone('091234567'), 'oman');
});

test('detectCountryFromPhone: Libya', () => {
  assert.strictEqual(detectCountryFromPhone('+218911234567'), 'libya');
  assert.strictEqual(detectCountryFromPhone('0911234567'), 'libya');
});

test('detectCountryFromPhone defaults to other', () => {
  assert.strictEqual(detectCountryFromPhone('+15551234567'), 'other');
  assert.strictEqual(detectCountryFromPhone(''), 'other');
  assert.strictEqual(detectCountryFromPhone(null), 'other');
});

test('formatInternationalPhone returns + prefix', () => {
  assert.strictEqual(formatInternationalPhone('01092919124'), '+201092919124');
  assert.strictEqual(formatInternationalPhone(''), '');
});

test('isValidPhone accepts valid numbers', () => {
  assert.strictEqual(isValidPhone('01092919124'), true);
  assert.strictEqual(isValidPhone('+966551234567'), true);
  assert.strictEqual(isValidPhone('+1-555-123-4567'), true);
});

test('isValidPhone rejects invalid numbers', () => {
  assert.strictEqual(isValidPhone(''), false);
  assert.strictEqual(isValidPhone('abc'), false);
  assert.strictEqual(isValidPhone('12'), false);
  assert.strictEqual(isValidPhone(null), false);
  assert.strictEqual(isValidPhone(undefined), false);
});

test('COUNTRY_KEYS includes all five countries', () => {
  assert.deepEqual(COUNTRY_KEYS, ['egypt', 'saudi_arabia', 'oman', 'libya', 'other']);
});