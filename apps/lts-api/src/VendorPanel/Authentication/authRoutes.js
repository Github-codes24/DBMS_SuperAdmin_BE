import express from 'express';
import { loginVendor, getVendorProfile, logoutVendor } from './authController.js';
import { protect } from './authMiddleware.js';

const router = express.Router();

router.post('/login', loginVendor);
router.post('/logout', protect, logoutVendor);
router.get('/profile', protect, getVendorProfile);

export default router;
