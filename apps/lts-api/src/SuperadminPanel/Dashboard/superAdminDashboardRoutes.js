import express from 'express';
import {
  getSuperAdminStats,
  getSuperAdminCascadeData,
  getSuperAdminDashboardOverview,
  addState,
  addCategory,
  addSubcategory,
} from './superAdminDashboardController.js';
import { protectSuperAdmin } from '../Authentication/authMiddleware.js';

const router = express.Router();

// Master Consolidated Overview API (Single API using Promise.allSettled)
router.get('/overview', protectSuperAdmin, getSuperAdminDashboardOverview);

// Individual Dashboard Stats & Cascade Filters APIs
router.get('/stats', protectSuperAdmin, getSuperAdminStats);
router.get('/cascade-data', protectSuperAdmin, getSuperAdminCascadeData);

// Add State, Category, Subcategory APIs
router.post('/states', protectSuperAdmin, addState);
router.post('/categories', protectSuperAdmin, addCategory);
router.post('/subcategories', protectSuperAdmin, addSubcategory);

export default router;
