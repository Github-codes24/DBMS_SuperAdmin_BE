/**
 * Telecaller CRM — Report Routes
 * Mounted at: /api/telecaller/report
 */
import express from 'express';
import { protectTelecaller } from '../middleware/telecallerAuth.js';
import { getNotifications, printNotifications } from '../controllers/report.controller.js';

const router = express.Router();

// NOTE: /print must be registered BEFORE /:id style routes to avoid param capture
router.get('/notifications/print', protectTelecaller, printNotifications);
router.get('/notifications',       protectTelecaller, getNotifications);

export default router;

