/**
 * Telecaller CRM — Vendor Routes
 * Mounted at: /api/telecaller/vendors
 */

import express from 'express';

import {
  protectTelecaller,
} from '../middleware/telecallerAuth.js';

import {
  uploadVendorImages,
  handleUploadError,
} from '../middleware/uploadVendorImage.js';

import {
  createNewVendor,
  getVendors,
  getVendorById,
  updatePersonal,
  uploadImages,
  setPrimaryImage,
  deleteImage,
  updateContactPayment,
  updateCategory,
  getTelecallers
} from '../controllers/vendor.controller.js';

import {
  createFollowup,
  getFollowups,
} from '../controllers/followup.controller.js';

const router = express.Router();

// Tellecaller Fetch ----------------------------------------------------------------------------------------------
router.get(
  '/telecallers',
  protectTelecaller,
  getTelecallers
);


// ── Vendor Create ─────────────────────────────────────────────────────────────

router.post(
  '/',
  protectTelecaller,
  createNewVendor
);

// ── Vendor List & Detail ──────────────────────────────────────────────────────




router.get(
  '/',
  protectTelecaller,
  getVendors
);

router.get(
  '/:id',
  protectTelecaller,
  getVendorById
);

// ── Personal Info ─────────────────────────────────────────────────────────────

router.put(
  '/:id/personal',
  protectTelecaller,
  updatePersonal
);

// ── Images ────────────────────────────────────────────────────────────────────

router.post(
  '/:id/images',
  protectTelecaller,
  uploadVendorImages,
  handleUploadError,
  uploadImages
);

router.patch(
  '/:id/images/:imageId/primary',
  protectTelecaller,
  setPrimaryImage
);

router.delete(
  '/:id/images/:imageId',
  protectTelecaller,
  deleteImage
);

// ── Contact & Payment ─────────────────────────────────────────────────────────

router.put(
  '/:id/contact-payment',
  protectTelecaller,
  updateContactPayment
);

// ── Category ───────────────────────────────────────────────────────────────────

router.put(
  '/:id/category',
  protectTelecaller,
  updateCategory
);

// ── Followups ─────────────────────────────────────────────────────────────────

router.post(
  '/:id/followup',
  protectTelecaller,
  createFollowup
);

router.get(
  '/:id/followups',
  protectTelecaller,
  getFollowups
)
/*-----------------------------------------*/

export default router;
