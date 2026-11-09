import express from 'express';
import { getActivePlans, getPlanById } from '../controllers/plan.controller.js';

const router = express.Router();

// GET all active subscription plans
router.get('/', getActivePlans);

// GET single plan by _id or planId
router.get('/:id', getPlanById);

export default router;
