/**
 * Telecaller Auth — Auth Routes
 * Mounted at: /api/telecaller/auth
 * Route order:
 *   POST   /signup           → Public Signup Disabled (SuperAdmin & Vendor Panel Only)
 *   POST   /login            → Public  → login
 *   GET    /me               → Private → getMe
 *   PUT    /change-password  → Private → changePassword
 */
import express from 'express';
import {
  loginValidation,
  changePasswordValidation,
  validate,
} from '../validations/auth.validation.js';
import verifyTelecaller from '../middleware/verifyTelecaller.js';
import {
  signup,
  login,
  getMe,
  changePassword,
} from '../controllers/auth.controller.js';

const router = express.Router();

// ── Public routes ─────────────────────────────────────────────────────────────
// Public registration disabled: Telecallers can ONLY be created by Super Admin or Vendor Panel
router.post('/signup', signup);
router.post('/login', loginValidation, validate, login);

// ── Protected routes (require valid TELECALLER JWT) ───────────────────────────
router.get('/me', verifyTelecaller, getMe);
router.put('/change-password', changePasswordValidation, validate, verifyTelecaller, changePassword);

export default router;
