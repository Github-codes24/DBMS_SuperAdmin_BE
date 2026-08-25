import express from 'express';
import {
  loginSuperAdmin,
  forgotPassword,
  verifyOtp,
  resendOtp,
  resetPassword,
  refreshAccessToken,
  logoutSuperAdmin,
  getCurrentUser,
} from './authController.js';
import { protectSuperAdmin } from './authMiddleware.js';

const router = express.Router();

// Login
router.post('/login', loginSuperAdmin);

// Forgot Password
router.post('/forgot-password', forgotPassword);

// Verify OTP
router.post('/verify-otp', verifyOtp);

// Resend OTP
router.post('/resend-otp', resendOtp);

// Reset Password
router.post('/reset-password', resetPassword);

// Refresh Token
router.post('/refresh-token', refreshAccessToken);

//  Logout (JWT Required)
router.post('/logout', protectSuperAdmin, logoutSuperAdmin);

//  Get Current User (JWT Required)
router.get('/me', protectSuperAdmin, getCurrentUser);
router.get('/profile', protectSuperAdmin, getCurrentUser);

export default router;
