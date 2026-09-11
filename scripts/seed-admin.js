import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import mongoose from 'mongoose';

await connectDB();
const email = process.env.ADMIN_EMAIL?.toLowerCase();
if (!email || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_PHONE) {
  throw new Error('ADMIN_EMAIL, ADMIN_PHONE and ADMIN_PASSWORD are required.');
}
const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
const user = await User.findOneAndUpdate(
  { email },
  {
    name: process.env.ADMIN_NAME || 'Learning Cave Admin',
    email,
    phone: process.env.ADMIN_PHONE,
    passwordHash,
    role: 'admin',
    accountStatus: 'active',
    emailVerified: true,
  },
  { upsert: true, new: true, setDefaultsOnInsert: true },
);
console.log(`Admin ready: ${user.email}`);
await mongoose.disconnect();
