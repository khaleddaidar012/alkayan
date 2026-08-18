const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { isValidReceipt, publicUrl, deleteFile, ALLOWED_MIMES, MAX_SIZE } = require('../services/fileUpload');

test('ALLOWED_MIMES: jpeg, png, pdf only', () => {
  assert.deepEqual(ALLOWED_MIMES, ['image/jpeg', 'image/png', 'application/pdf']);
});

test('MAX_SIZE is 10MB', () => {
  assert.strictEqual(MAX_SIZE, 10 * 1024 * 1024);
});

test('isValidReceipt: null/undefined file rejected', () => {
  assert.deepEqual(isValidReceipt(null), { valid: false, reason: 'No file provided' });
  assert.deepEqual(isValidReceipt(undefined), { valid: false, reason: 'No file provided' });
});

test('isValidReceipt: allowed mimes pass', () => {
  for (const mime of ALLOWED_MIMES) {
    const result = isValidReceipt({ mimetype: mime, size: 1024 });
    assert.strictEqual(result.valid, true, `${mime} should be valid`);
  }
});

test('isValidReceipt: disallowed mime rejected', () => {
  const result = isValidReceipt({ mimetype: 'text/html', size: 1024 });
  assert.deepEqual(result, { valid: false, reason: 'Invalid file type. Allowed: JPG, PNG, PDF' });
});

test('isValidReceipt: file over 10MB rejected', () => {
  const result = isValidReceipt({ mimetype: 'image/png', size: MAX_SIZE + 1 });
  assert.deepEqual(result, { valid: false, reason: 'File exceeds 10MB limit' });
});

test('isValidReceipt: exactly 10MB passes', () => {
  const result = isValidReceipt({ mimetype: 'image/png', size: MAX_SIZE });
  assert.strictEqual(result.valid, true);
});

test('publicUrl builds /uploads path', () => {
  assert.strictEqual(publicUrl({ filename: 'abc.png' }), '/uploads/abc.png');
});

test('deleteFile ignores non-uploads paths and does not throw', () => {
  assert.doesNotThrow(() => deleteFile(null));
  assert.doesNotThrow(() => deleteFile(''));
  assert.doesNotThrow(() => deleteFile('/etc/passwd'));
  assert.doesNotThrow(() => deleteFile('/uploads/does-not-exist.png'));
});

test('deleteFile removes an existing file inside uploads dir', () => {
  const fs = require('node:fs');
  const { UPLOAD_DIR } = require('../services/fileUpload');
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const filename = `unit-test-${Date.now()}.txt`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), 'x');
  assert.strictEqual(fs.existsSync(path.join(UPLOAD_DIR, filename)), true);
  deleteFile(`/uploads/${filename}`);
  assert.strictEqual(fs.existsSync(path.join(UPLOAD_DIR, filename)), false);
});