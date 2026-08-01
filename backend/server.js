// Check if goals route is included in server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});