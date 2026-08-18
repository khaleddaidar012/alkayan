const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CommunicationType = require('../models/CommunicationType');

const SYSTEM_TYPES = [
  { name: 'WhatsApp', icon: '💬', is_system: true, sort_order: 1 },
  { name: 'Phone Call', icon: '📞', is_system: true, sort_order: 2 },
  { name: 'Meeting', icon: '🤝', is_system: true, sort_order: 3 },
  { name: 'Email', icon: '📧', is_system: true, sort_order: 4 },
  { name: 'Other', icon: '📝', is_system: true, sort_order: 5 }
];

async function seed() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_URI not found in .env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  let created = 0;
  for (const t of SYSTEM_TYPES) {
    const exists = await CommunicationType.findOne({ name: t.name });
    if (!exists) {
      await CommunicationType.create(t);
      created++;
    }
  }
  console.log(`Seeded ${created} communication types (existing skipped)`);
  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });