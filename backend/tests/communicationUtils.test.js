const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSlider, truncate, round2 } = require('../utils/communicationUtils');

test('buildSlider: empty list returns nulls', () => {
  const s = buildSlider([]);
  assert.strictEqual(s.customer, null);
  assert.strictEqual(s.employee, null);
  assert.strictEqual(s.last, null);
  assert.strictEqual(s.count, 0);
  assert.deepEqual(buildSlider(null), buildSlider([]));
});

test('buildSlider: picks latest customer and latest employee message', () => {
  const messages = [
    { sender_type: 'employee', content: 'e1' },
    { sender_type: 'customer', content: 'c1' },
    { sender_type: 'employee', content: 'e2' },
    { sender_type: 'customer', content: 'c2' }
  ];
  const s = buildSlider(messages);
  assert.strictEqual(s.customer.content, 'c2');
  assert.strictEqual(s.employee.content, 'e2');
  assert.strictEqual(s.last.content, 'c2');
  assert.strictEqual(s.count, 4);
});

test('buildSlider: only one sender type present', () => {
  const onlyCustomer = [{ sender_type: 'customer', content: 'hi' }];
  const s = buildSlider(onlyCustomer);
  assert.strictEqual(s.customer.content, 'hi');
  assert.strictEqual(s.employee, null);
});

test('buildSlider: messages order is newest last', () => {
  const s = buildSlider([{ sender_type: 'employee', content: 'old' }, { sender_type: 'customer', content: 'new' }]);
  assert.strictEqual(s.last.content, 'new');
});

test('truncate: keeps short messages, truncates long with ellipsis', () => {
  assert.strictEqual(truncate('hello'), 'hello');
  assert.strictEqual(truncate('a'.repeat(50)), 'a'.repeat(50));
  assert.strictEqual(truncate('a'.repeat(60)), 'a'.repeat(50) + '...');
  assert.strictEqual(truncate(''), '');
  assert.strictEqual(truncate(null), '');
  assert.strictEqual(truncate('x'.repeat(100), 10), 'x'.repeat(10) + '...');
});

test('round2 rounds to two decimals', () => {
  assert.strictEqual(round2(1.006), 1.01);
  assert.strictEqual(round2('12.34'), 12.34);
  assert.strictEqual(round2('abc'), 0);
});