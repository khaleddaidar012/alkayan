const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');

const users = [
  {
    name: 'Admin',
    email: 'admin@alkayan.com',
    password: 'admin123',
    role: 'admin',
    permissions: User.adminPermissions,
    lang: 'ar',
    theme: 'dark'
  },
  {
    name: 'Manager',
    email: 'manager@alkayan.com',
    password: 'manager123',
    role: 'manager',
    permissions: User.managerPermissions,
    lang: 'en',
    theme: 'light'
  },
  {
    name: 'Employee',
    email: 'employee@alkayan.com',
    password: 'employee123',
    role: 'employee',
    permissions: User.employeePermissions,
    lang: 'ar',
    theme: 'light'
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    await User.deleteMany({});
    console.log('Users cleared');

    for (const userData of users) {
      const user = await User.create(userData);
      console.log(`User created: ${user.email} (${user.role})`);
    }

    console.log('Seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDB();
