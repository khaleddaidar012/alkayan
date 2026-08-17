const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getPriceForCountry,
  currencyForCountry,
  formatCurrencyAmount,
  CURRENCIES
} = require('../utils/pricing');

const samplePrices = {
  egypt_price: 500,
  saudi_arabia_price: 100,
  oman_price: 10,
  libya_price: 200,
  usd_fallback_price: 25
};

test('getPriceForCountry: Egypt returns EGP price', () => {
  assert.deepEqual(getPriceForCountry(samplePrices, 'egypt'), { amount: 500, currency: 'EGP' });
});

test('getPriceForCountry: Saudi Arabia returns SAR price', () => {
  assert.deepEqual(getPriceForCountry(samplePrices, 'saudi_arabia'), { amount: 100, currency: 'SAR' });
});

test('getPriceForCountry: Oman returns OMR price', () => {
  assert.deepEqual(getPriceForCountry(samplePrices, 'oman'), { amount: 10, currency: 'OMR' });
});

test('getPriceForCountry: Libya returns LYD price', () => {
  assert.deepEqual(getPriceForCountry(samplePrices, 'libya'), { amount: 200, currency: 'LYD' });
});

test('getPriceForCountry: unknown country returns USD fallback', () => {
  assert.deepEqual(getPriceForCountry(samplePrices, 'france'), { amount: 25, currency: 'USD' });
});

test('getPriceForCountry: other returns USD fallback', () => {
  assert.deepEqual(getPriceForCountry(samplePrices, 'other'), { amount: 25, currency: 'USD' });
});

test('getPriceForCountry: null price doc returns 0 USD', () => {
  assert.deepEqual(getPriceForCountry(null, 'egypt'), { amount: 0, currency: 'EGP' });
  assert.deepEqual(getPriceForCountry(null, 'france'), { amount: 0, currency: 'USD' });
});

test('currencyForCountry maps each supported country', () => {
  assert.strictEqual(currencyForCountry('egypt'), 'EGP');
  assert.strictEqual(currencyForCountry('saudi_arabia'), 'SAR');
  assert.strictEqual(currencyForCountry('oman'), 'OMR');
  assert.strictEqual(currencyForCountry('libya'), 'LYD');
  assert.strictEqual(currencyForCountry('other'), 'USD');
  assert.strictEqual(currencyForCountry('france'), 'USD');
});

test('formatCurrencyAmount formats with currency code', () => {
  assert.strictEqual(formatCurrencyAmount(500, 'EGP', 'en'), '500 EGP');
  assert.strictEqual(formatCurrencyAmount(100.5, 'SAR', 'en'), '100.5 SAR');
  assert.strictEqual(formatCurrencyAmount(0, 'USD', 'en'), '0 USD');
});

test('CURRENCIES includes all five ISO 4217 codes', () => {
  assert.deepEqual(Object.keys(CURRENCIES), ['EGP', 'SAR', 'OMR', 'LYD', 'USD']);
});