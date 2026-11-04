import asyncHandler from 'express-async-handler';
import * as authService from '../services/auth.service.js';

// ─── POST /api/telecaller/auth/signup ─────────────────────────────────────────
/**
 * @desc   Public registration endpoint disabled
 * @route  POST /api/telecaller/auth/signup
 * @access Disabled (Super Admin and Vendor Panel Only)
 */
export const signup = asyncHandler(async (req, res) => {
  const {
    name,
    employeeId,
    email,
    phone,
    password,
  } = req.body;

  try {
    const result = await authService.signup({
      name,
      employeeId,
      email,
      phone,
      password,
    });

    return res.status(201).json({
      success: true,
      message: result.message || 'Telecaller registered successfully. Account pending Super Admin activation.',
      data: result.telecaller,
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
});

// ─── POST /api/telecaller/auth/login ──────────────────────────────────────────

/**
 * @desc   Login with email and password (enforces active status in both schemas)
 * @route  POST /api/telecaller/auth/login
 * @access Public
 */
export const login = asyncHandler(async (req, res) => {
  const {
    email,
    password,
  } = req.body;

  try {
    const { token, telecaller } = await authService.login({
      email,
      password,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: telecaller,
    });
  } catch (error) {
    const statusCode = error.statusCode || (error.message.includes('pending activation') || error.message.includes('blocked') ? 403 : 401);
    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
});

// ─── GET /api/telecaller/auth/me ──────────────────────────────────────────────

/**
 * @desc   Get logged-in telecaller profile
 * @route  GET /api/telecaller/auth/me
 * @access Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const profile = authService.getMe(req.telecaller);

  return res.status(200).json({
    success: true,
    message: 'Profile fetched successfully',
    data: profile,
  });
});

// ─── PUT /api/telecaller/auth/change-password ─────────────────────────────────

/**
 * @desc   Change password for logged-in telecaller
 * @route  PUT /api/telecaller/auth/change-password
 * @access Private
 */
export const changePassword = asyncHandler(async (req, res) => {
  const {
    oldPassword,
    newPassword,
  } = req.body;

  try {
    await authService.changePassword(
      req.telecaller,
      oldPassword,
      newPassword
    );

  return res.status(200).json({
    success: true,
    message: 'Password changed successfully',
    data: null,
  });
});
