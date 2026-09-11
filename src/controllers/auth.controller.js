import jwt from 'jsonwebtoken';
import * as authService from '../services/auth.service.js';
import { asyncHandler } from '../utils/async-handler.js';

const cookieBase = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax',
  path: '/',
});

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.validated.body);
  res.status(201).json({ success: true, message: 'Registration successful.', data: result });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.validated.body);
  res.cookie('access_token', result.accessToken, { ...cookieBase(), maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', result.refreshToken, { ...cookieBase(), maxAge: 30 * 24 * 60 * 60 * 1000 });
  res.json({ success: true, message: 'Login successful.', data: { user: result.user, accessToken: result.accessToken } });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refresh_token || req.body?.refreshToken;
  const result = await authService.refresh(token);
  res.cookie('access_token', result.accessToken, { ...cookieBase(), maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', result.refreshToken, { ...cookieBase(), maxAge: 30 * 24 * 60 * 60 * 1000 });
  res.json({ success: true, data: { user: result.user, accessToken: result.accessToken } });
});

export const logout = asyncHandler(async (req, res) => {
  let userId = req.user?._id;
  if (!userId && req.cookies?.refresh_token) {
    try { userId = jwt.verify(req.cookies.refresh_token, process.env.JWT_REFRESH_SECRET).sub; } catch {}
  }
  await authService.logout(userId);
  res.clearCookie('access_token', cookieBase());
  res.clearCookie('refresh_token', cookieBase());
  res.json({ success: true, message: 'Logged out successfully.' });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});
