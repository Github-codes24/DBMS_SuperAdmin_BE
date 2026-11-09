import express from 'express';
import {
  updateVendorProfile,
  updateVendorPassword,
  updateVendorPreferences,
} from './profileController.js';
import { protect } from '../Authentication/authMiddleware.js';

const router = express.Router();

router.put('/', protect, updateVendorProfile);
router.put('/password', protect, updateVendorPassword);
router.put('/preferences', protect, updateVendorPreferences);

export default router;
