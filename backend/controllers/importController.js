const Customer = require('../models/Customer');
const Course = require('../models/Course');
const User = require('../models/User');

const fieldConfigs = {
  customers: {
    model: Customer,
    uniqueKey: 'phone',
    fields: {
      'Customer Name': { path: 'name', required: true, type: 'string' },
      'Phone': { path: 'phone', required: true, type: 'string' },
      'WhatsApp': { path: 'whatsapp', type: 'string' },
      'Email': { path: 'email', type: 'string' },
      'Program': { path: 'program', type: 'string' },
      'Status': { path: 'status', type: 'enum', values: ['subscribed', 'potential', 'thinking', 'noResponse', 'rejected'] },
      'Assigned Employee': { path: 'assignedEmployee', type: 'ref', model: 'User' },
      'Registration Date': { path: 'registrationDate', type: 'date' },
      'Notes': { path: 'notes', type: 'string' }
    }
  },
  programs: {
    model: Course,
    uniqueKey: 'name',
    fields: {
      'Name': { path: 'name', required: true, type: 'string' },
      'Description': { path: 'description', type: 'string' },
      'Price': { path: 'price', required: true, type: 'number' },
      'Duration': { path: 'duration', type: 'string' },
      'Instructor': { path: 'instructor', type: 'string' },
      'Start Date': { path: 'startDate', required: true, type: 'date' },
      'End Date': { path: 'endDate', required: true, type: 'date' },
      'Capacity': { path: 'capacity', type: 'number' },
      'Status': { path: 'status', type: 'enum', values: ['active', 'completed', 'cancelled', 'draft'] }
    }
  }
};

exports.getFieldConfig = (req, res) => {
  const { collection } = req.params;
  const config = fieldConfigs[collection];
  if (!config) return res.status(400).json({ message: 'Invalid collection' });

  const fields = Object.entries(config.fields).map(([label, cfg]) => ({
    label,
    field: cfg.path,
    required: cfg.required || false,
    type: cfg.type || 'string',
    values: cfg.values || null
  }));

  res.json({ fields, uniqueKey: config.uniqueKey });
};

exports.importData = async (req, res) => {
  const { collection, mapping, rows, duplicateBehavior, duplicateKey } = req.body;

  const config = fieldConfigs[collection];
  if (!config) return res.status(400).json({ message: 'Invalid collection' });

  const Model = config.model;
  const results = {
    imported: 0,
    skipped: 0,
    updated: 0,
    errors: 0,
    total: rows.length,
    errorRows: [],
    failedData: []
  };

  const keyField = duplicateKey || config.uniqueKey;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const doc = {};

    for (const [sourceCol, targetField] of Object.entries(mapping)) {
      if (!targetField || targetField === '_ignore') continue;
      let value = row[sourceCol];
      if (value === undefined || value === null || value === '') continue;

      const fieldDef = config.fields[Object.keys(config.fields).find(k => config.fields[k].path === targetField)];
      if (fieldDef) {
        if (fieldDef.type === 'date' && value) {
          const d = new Date(value);
          if (!isNaN(d.getTime())) value = d;
        }
        if (fieldDef.type === 'number' && value) {
          const n = parseFloat(value);
          if (!isNaN(n)) value = n;
          else value = null;
        }
        if (fieldDef.type === 'ref' && targetField === 'assignedEmployee') {
          const user = await User.findOne({ name: value });
          if (user) value = user._id;
          else value = null;
        }
        if (fieldDef.type === 'enum' && fieldDef.values && !fieldDef.values.includes(value)) {
          const normalized = fieldDef.values.find(v => v.toLowerCase() === String(value).toLowerCase());
          value = normalized || null;
        }
      }

      doc[targetField] = value;
    }

    const missingRequired = Object.entries(config.fields)
      .filter(([, f]) => f.required)
      .some(([, f]) => !doc[f.path] || doc[f.path] === '');

    if (missingRequired) {
      results.errors++;
      results.errorRows.push(i + 1);
      results.failedData.push({ row: i + 1, reason: 'Missing required fields', data: row });
      continue;
    }

    const keyValue = doc[keyField];
    const keyStr = keyValue ? String(keyValue).trim() : '';

    if (collection === 'customers' && keyStr && !/^[\d\s\+\-\(\)]{7,20}$/.test(keyStr)) {
      results.errors++;
      results.errorRows.push(i + 1);
      results.failedData.push({ row: i + 1, reason: 'Invalid phone number', data: row });
      continue;
    }

    try {
      if (duplicateBehavior === 'skip' && keyStr) {
        const query = collection === 'customers' ? { [keyField]: keyStr } : { [keyField]: { $regex: new RegExp(`^${keyStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } };
        const existing = await Model.findOne(query);
        if (existing) {
          results.skipped++;
          continue;
        }
      }

      if (duplicateBehavior === 'update' && keyStr) {
        const query = collection === 'customers' ? { [keyField]: keyStr } : { [keyField]: { $regex: new RegExp(`^${keyStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } };
        const existing = await Model.findOne(query);
        if (existing) {
          await Model.findByIdAndUpdate(existing._id, { $set: doc });
          results.updated++;
          continue;
        }
      }

      await Model.create(doc);
      results.imported++;
    } catch (err) {
      results.errors++;
      results.errorRows.push(i + 1);
      results.failedData.push({ row: i + 1, reason: err.message, data: row });
    }
  }

  res.json({ results });
};