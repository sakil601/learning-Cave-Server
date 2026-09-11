import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phone: { type: String, required: true, unique: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  refreshTokenHash: { type: String, select: false },
  role: { type: String, enum: ['student', 'instructor', 'admin'], default: 'student', index: true },
  accountStatus: { type: String, enum: ['pending', 'active', 'rejected', 'suspended'], default: 'active', index: true },
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  avatar: String,
  lastLoginAt: Date,
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', userSchema);
