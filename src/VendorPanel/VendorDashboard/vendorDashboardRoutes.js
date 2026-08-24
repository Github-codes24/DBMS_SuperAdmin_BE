import express from 'express';
import {
  getDashboardStats,
  getCascadeData,
  addState,
  addCategory,
  addSubcategory,
} from './vendorDashboardController.js';
import { protect } from '../Authentication/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, getDashboardStats);
router.get('/cascade-data', protect, getCascadeData);
router.post('/states', protect, addState);
router.post('/categories', protect, addCategory);
router.post('/subcategories', protect, addSubcategory);

export default router;
