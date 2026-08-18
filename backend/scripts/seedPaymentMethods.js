const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PaymentMethod = require('../models/PaymentMethod');

const DEFAULT_METHODS = [
  { name: 'Vodafone Cash', country: 'egypt', sort_order: 1 },
  { name: 'InstaPay', country: 'egypt', sort_order: 2 },
  { name: 'STC Pay', country: 'saudi_arabia', sort_order: 1 },
  { name: 'Cash', country: 'global', sort_order: 99 },
  { name: 'Bank Transfer', country: 'global', sort_order: 100 },
  { name: 'Other', country: 'global', sort_order: 101 }
];

async function seed() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_URI not found in .env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  let created = 0;
  for (const m of DEFAULT_METHODS) {
    const exists = await PaymentMethod.findOne({ name: m.name, country: m.country });
    if (!exists) {
      await PaymentMethod.create(m);
      created++;
    }
  }
  console.log(`Seeded ${created} payment methods (existing skipped)`);
  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
