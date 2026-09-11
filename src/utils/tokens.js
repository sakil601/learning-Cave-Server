import jwt from 'jsonwebtoken';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' },
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '30d' },
  );
}
