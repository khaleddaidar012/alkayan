const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Customer = require('../models/Customer');
  const db = mongoose.connection.db;
  const coll = db.collection('customers');

  // Normalize legacy documents so the partial index covers all active customers
  const upd = await coll.updateMany(
    { isDeleted: { $exists: false } },
    { $set: { isDeleted: false } }
  );
  console.log(`Normalized ${upd.modifiedCount} legacy customers to isDeleted:false`);

  const currentIndexes = await coll.indexes();
  const hasOld = currentIndexes.some(idx => idx.name === 'whatsapp_number_1');
  if (hasOld) {
    await coll.dropIndex('whatsapp_number_1');
    console.log('Dropped old whatsapp_number_1 index');
  }

  await Customer.syncIndexes();
  console.log('Indexes synced for customers:');
  const after = await coll.indexes();
  after.forEach(idx => console.log(' -', idx.name, JSON.stringify(idx.key), idx.unique ? 'unique' : '', idx.partialFilterExpression ? JSON.stringify(idx.partialFilterExpression) : ''));
  await mongoose.disconnect();
}

main().catch(e => { console.error('FATAL', e.message); process.exit(1); });