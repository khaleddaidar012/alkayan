const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024;

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^a-z0-9.]/g, '') || '.jpg';
    const unique = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter(req, file, cb) {
    if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true);
    const err = new Error('Invalid file type. Allowed: JPG, PNG, PDF');
    err.status = 400;
    cb(err);
  }
});

function isValidReceipt(file) {
  if (!file) return { valid: false, reason: 'No file provided' };
  if (!ALLOWED_MIMES.includes(file.mimetype)) return { valid: false, reason: 'Invalid file type. Allowed: JPG, PNG, PDF' };
  if (file.size > MAX_SIZE) return { valid: false, reason: 'File exceeds 10MB limit' };
  return { valid: true };
}

function publicUrl(file) {
  return `/uploads/${file.filename}`;
}

function deleteFile(relativeUrl) {
  if (!relativeUrl || !relativeUrl.startsWith('/uploads/')) return;
  const filename = path.basename(relativeUrl);
  const fullPath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(fullPath)) {
    try { fs.unlinkSync(fullPath); } catch { /* ignore */ }
  }
}

module.exports = { upload, isValidReceipt, publicUrl, deleteFile, UPLOAD_DIR, ALLOWED_MIMES, MAX_SIZE };