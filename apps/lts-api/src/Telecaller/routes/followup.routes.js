/**
 * Telecaller CRM — Followup Routes
 * Mounted at: /api/telecaller/followup
 *
 * Note: These routes also handle the followup sub-resources on a vendor.
 * Primary followup endpoints are registered under /api/telecaller/vendors/:id/followup(s).
 * This router provides a top-level followup endpoint for future standalone use.
 */
import express from 'express';
import { protectTelecaller } from '../middleware/telecallerAuth.js';
import { createFollowup, getFollowups } from '../controllers/followup.controller.js';

const router = express.Router();
// Top-level followup endpoints
// POST /api/telecaller/followup/:vendorId
router.post('/:vendorId',  protectTelecaller, (req, res, next) => {
  req.params.id = req.params.vendorId;
  next();
}, createFollowup);

// GET /api/telecaller/followup/:vendorId
router.get('/:vendorId',   protectTelecaller, (req, res, next) => {
  req.params.id = req.params.vendorId;
  next();
}, getFollowups);

export default router;
