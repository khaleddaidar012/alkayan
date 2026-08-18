// Check if goals route is included in server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const multer = require('multer');
const connectDB = require('./config/db');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Force UTF-8 charset on all text responses to prevent mojibake
app.use((req, res, next) => {
  const send = res.send.bind(res);
  res.send = function (body) {
    const contentType = res.get('Content-Type') || '';
    if (!/charset=/i.test(contentType)) {
      const base = contentType || (typeof body === 'string' ? 'text/html' : 'application/json');
      res.setHeader('Content-Type', `${base}; charset=utf-8`);
    }
    return send(body);
  };
  next();
});

// Serve uploaded receipts with auth-aware handling
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Serve the frontend build with UTF-8 charset
app.use(express.static(path.join(__dirname, '../frontend'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
  }
}));

connectDB();

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/programs', require('./routes/programs'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/import', require('./routes/import'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/settings/prices', require('./routes/prices'));
app.use('/api/payment-methods', require('./routes/paymentMethods'));
app.use('/api/payments', require('./routes/payments'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Multer / upload error handler
app.use((err, req, res, next) => {
  if (err && (err instanceof multer.MulterError || err.name === 'MulterError')) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds 10MB limit' : `Upload error: ${err.message}`;
    return res.status(400).json({ message });
  }
  if (err && err.status) {
    return res.status(err.status).json({ message: err.message });
  }
  next(err);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});