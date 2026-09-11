import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';

export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.get('authorization');
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const token = bearer || req.cookies?.access_token;
  if (!token) throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication required.');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch {
    throw new ApiError(401, 'INVALID_ACCESS_TOKEN', 'Access token is invalid or expired.');
  }

  const user = await User.findById(payload.sub).select('-passwordHash -refreshTokenHash');
  if (!user) throw new ApiError(401, 'USER_NOT_FOUND', 'User account was not found.');
  if (user.accountStatus === 'suspended') {
    throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended.');
  }
  if (user.role === 'instructor' && user.accountStatus !== 'active') {
    throw new ApiError(403, 'INSTRUCTOR_PENDING_APPROVAL', 'Instructor account is not active yet.');
  }

  req.user = user;
  next();
});

export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
  }
  next();
};
