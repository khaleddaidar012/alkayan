const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const CustomerStatus = require('../models/CustomerStatus');

const SEED = [
  { name: 'New', color: '#6B7280', sort_order: 1, description: 'New lead, not contacted yet' },
  { name: 'Contacted', color: '#3B82F6', sort_order: 2, description: 'Customer has been contacted' },
  { name: 'Transferred to Phone', color: '#8B5CF6', sort_order: 3, description: 'Moved to a phone conversation' },
  { name: 'Interested', color: '#F59E0B', sort_order: 4, description: 'Customer is interested in the program' },
  { name: 'Not Interested', color: '#EF4444', sort_order: 5, description: 'Customer is not interested' },
  { name: 'Subscribed', color: '#10B981', sort_order: 6, description: 'Customer has subscribed' },
  { name: 'Cancelled', color: '#6B7280', sort_order: 7, description: 'Subscription cancelled' }
];

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const existing = await CustomerStatus.countDocuments({ is_system: true });
    if (existing > 0) {
      console.log(`System statuses already seeded (${existing}). Skipping.`);
      process.exit(0);
    }
    await CustomerStatus.insertMany(SEED.map(s => ({ ...s, is_system: true })));
    console.log(`Seeded ${SEED.length} system statuses.`);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

run();