import express from 'express';
import {
  sendLoginOtp,
  verifyLoginOtp,
  resendLoginOtp,
  refreshAccessToken,
  logoutSuperAdmin,
  getCurrentUser,
} from './authController.js';
import { protectSuperAdmin } from './authMiddleware.js';

const router = express.Router();

// Send OTP (Public)
router.post('/send-otp', sendLoginOtp);

// Verify OTP & Login (Public)
router.post('/verify-otp', verifyLoginOtp);
router.post('/login', verifyLoginOtp);

// Resend OTP (Public)
router.post('/resend-otp', resendLoginOtp);

// Refresh Token
router.post('/refresh-token', refreshAccessToken);

//  Logout (JWT Required)
router.post('/logout', protectSuperAdmin, logoutSuperAdmin);

//  Get Current User (JWT Required)
router.get('/me', protectSuperAdmin, getCurrentUser);
router.get('/profile', protectSuperAdmin, getCurrentUser);

export default router;
