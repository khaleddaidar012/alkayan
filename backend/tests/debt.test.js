const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDebt, hasDebt, debtStatus, round2 } = require('../utils/debt');

test('calculateDebt: empty list returns zeros', () => {
  assert.deepEqual(calculateDebt([]), { total_in: 0, total_out: 0, balance: 0 });
  assert.deepEqual(calculateDebt(null), { total_in: 0, total_out: 0, balance: 0 });
});

test('calculateDebt: only "in" payments', () => {
  const debt = calculateDebt([
    { amount: 100, direction: 'in' },
    { amount: 50, direction: 'in' }
  ]);
  assert.deepEqual(debt, { total_in: 150, total_out: 0, balance: 150 });
});

test('calculateDebt: only "out" payments', () => {
  const debt = calculateDebt([
    { amount: 30, direction: 'out' },
    { amount: 20, direction: 'out' }
  ]);
  assert.deepEqual(debt, { total_in: 0, total_out: 50, balance: -50 });
});

test('calculateDebt: mixed in/out', () => {
  const debt = calculateDebt([
    { amount: 100, direction: 'in' },
    { amount: 25, direction: 'out' }
  ]);
  assert.deepEqual(debt, { total_in: 100, total_out: 25, balance: 75 });
});

test('calculateDebt: ignores unknown directions and invalid amounts', () => {
  const debt = calculateDebt([
    { amount: 100, direction: 'in' },
    { amount: 50, direction: 'sideways' },
    { amount: 'not-a-number', direction: 'out' },
    null
  ]);
  assert.deepEqual(debt, { total_in: 100, total_out: 0, balance: 100 });
});

test('calculateDebt: rounds to two decimals', () => {
  const debt = calculateDebt([
    { amount: 100.555, direction: 'in' },
    { amount: 10.004, direction: 'out' }
  ]);
  assert.deepEqual(debt, { total_in: 100.56, total_out: 10, balance: 90.56 });
});

test('hasDebt: positive balance means debt', () => {
  assert.strictEqual(hasDebt([{ amount: 10, direction: 'in' }]), true);
  assert.strictEqual(hasDebt([{ amount: 10, direction: 'in' }, { amount: 10, direction: 'out' }]), false);
  assert.strictEqual(hasDebt([{ amount: 5, direction: 'out' }]), false);
});

test('debtStatus: has_debt / settled / overpaid', () => {
  assert.strictEqual(debtStatus([{ amount: 10, direction: 'in' }]), 'has_debt');
  assert.strictEqual(debtStatus([{ amount: 10, direction: 'in' }, { amount: 10, direction: 'out' }]), 'settled');
  assert.strictEqual(debtStatus([{ amount: 5, direction: 'out' }]), 'overpaid');
  assert.strictEqual(debtStatus([]), 'settled');
});

test('round2 rounds to two decimals', () => {
  assert.strictEqual(round2(1.006), 1.01);
  assert.strictEqual(round2(1.004), 1);
  assert.strictEqual(round2('12.34'), 12.34);
  assert.strictEqual(round2('abc'), 0);
  assert.strictEqual(round2(null), 0);
});