const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Admin } = require('../models/User');

dotenv.config();

const seedAdmin = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log('MongoDB connected');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    if (existingAdmin) {
      console.log('Admin already exists');
      process.exit(0);
    }

    // Create admin
    const admin = new Admin({
      email: process.env.ADMIN_EMAIL || 'admin@felicity.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@123',
    });

    await admin.save();
    console.log('Admin seeded successfully');
    console.log('Email:', admin.email);
    console.log('Password:', process.env.ADMIN_PASSWORD || 'Admin@123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedAdmin();
