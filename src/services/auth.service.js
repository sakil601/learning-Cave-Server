import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import InstructorProfile from '../models/InstructorProfile.js';
import { ApiError } from '../utils/api-error.js';
import { signAccessToken, signRefreshToken } from '../utils/tokens.js';

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  accountStatus: user.accountStatus,
  emailVerified: user.emailVerified,
  phoneVerified: user.phoneVerified,
});

export async function register(input) {
  const email = input.email.toLowerCase().trim();
  const exists = await User.findOne({ $or: [{ email }, { phone: input.phone.trim() }] });
  if (exists) throw new ApiError(409, 'ACCOUNT_ALREADY_EXISTS', 'Email or phone is already registered.');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const accountStatus = input.role === 'instructor' ? 'pending' : 'active';
  const user = await User.create({
    name: input.name.trim(), email, phone: input.phone.trim(), passwordHash,
    role: input.role, accountStatus,
  });

  if (input.role === 'instructor') await InstructorProfile.create({ user: user._id });
  return { user: publicUser(user) };
}

export async function login({ login, password }) {
  const normalized = login.trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ email: normalized }, { phone: login.trim() }],
  }).select('+passwordHash +refreshTokenHash');

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email/phone or password.');
  }
  if (user.accountStatus === 'suspended') throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended.');
  if (user.role === 'instructor' && user.accountStatus !== 'active') {
    const code = user.accountStatus === 'pending' ? 'INSTRUCTOR_PENDING_APPROVAL' : 'INSTRUCTOR_NOT_ACTIVE';
    throw new ApiError(403, code, 'Instructor account is not active yet.');
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 12);
  user.lastLoginAt = new Date();
  await user.save();

  return { user: publicUser(user), accessToken, refreshToken };
}

export async function refresh(refreshToken) {
  if (!refreshToken) throw new ApiError(401, 'REFRESH_TOKEN_REQUIRED', 'Refresh token is required.');
  let payload;
  try { payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET); }
  catch { throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.'); }

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user?.refreshTokenHash || !(await bcrypt.compare(refreshToken, user.refreshTokenHash))) {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid.');
  }
  if (user.accountStatus === 'suspended') throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended.');

  const accessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);
  user.refreshTokenHash = await bcrypt.hash(newRefreshToken, 12);
  await user.save();
  return { user: publicUser(user), accessToken, refreshToken: newRefreshToken };
}

export async function logout(userId) {
  if (userId) await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } });
}
