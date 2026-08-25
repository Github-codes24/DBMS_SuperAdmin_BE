/**
 * Telecaller CRM — Payment Routes
 * Mounted at: /api/telecaller/payment
 */
import express from 'express';
import { protectTelecaller } from '../middleware/telecallerAuth.js';
import { createOrder, sendPaymentLink } from '../controllers/payment.controller.js';

const router = express.Router();

router.post('/create-order',          protectTelecaller, createOrder);
router.post('/send-link/:orderId',    protectTelecaller, sendPaymentLink);

export default router;

