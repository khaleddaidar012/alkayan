const { test } = require('node:test');
const assert = require('node:assert');
const { isValidHexColor, hexToRgb, readableTextColor } = require('../utils/statusUtils');

test('isValidHexColor: accepts valid #RRGGBB', () => {
  assert.strictEqual(isValidHexColor('#3B82F6'), true);
  assert.strictEqual(isValidHexColor('#6b7280'), true);
});

test('isValidHexColor: rejects invalid colors', () => {
  assert.strictEqual(isValidHexColor('#FFF'), false);
  assert.strictEqual(isValidHexColor('blue'), false);
  assert.strictEqual(isValidHexColor('#GGGGGG'), false);
  assert.strictEqual(isValidHexColor('#12345'), false);
  assert.strictEqual(isValidHexColor(''), false);
});

test('hexToRgb: parses channels', () => {
  assert.deepStrictEqual(hexToRgb('#FF0000'), { r: 255, g: 0, b: 0 });
  assert.deepStrictEqual(hexToRgb('#00FF00'), { r: 0, g: 255, b: 0 });
  assert.strictEqual(hexToRgb('nope'), null);
});

test('readableTextColor: dark colors get white text', () => {
  assert.strictEqual(readableTextColor('#111827'), '#FFFFFF');
  assert.strictEqual(readableTextColor('#10B981'), '#FFFFFF');
});

test('readableTextColor: light colors get dark text', () => {
  assert.strictEqual(readableTextColor('#F59E0B'), '#111827');
  assert.strictEqual(readableTextColor('#FFFFFF'), '#111827');
});

test('readableTextColor: invalid falls back to white', () => {
  assert.strictEqual(readableTextColor('bad'), '#FFFFFF');
});