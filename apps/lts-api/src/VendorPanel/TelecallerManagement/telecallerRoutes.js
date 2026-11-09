import express from 'express';
import { createVendorTelecaller, getVendorTelecallers } from './telecallerController.js';
import { protect } from '../Authentication/authMiddleware.js';

const router = express.Router();

// All routes are protected by Vendor authentication middleware
router.post('/', protect, createVendorTelecaller);
router.get('/', protect, getVendorTelecallers);

export default router;
