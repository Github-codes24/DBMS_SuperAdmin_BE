import express from 'express';
import {
  getDashboardStats,
  getCascadeData,
  addState,
  addCategory,
  addSubcategory,
getProjectCategories,
  getSubcategoriesByCategory,
  getProjects,
} from './vendorDashboardController.js';
import { protect } from '../Authentication/authMiddleware.js';
import { protectSuperAdmin } from '../../SuperadminPanel/Authentication/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, getDashboardStats);
router.get('/cascade-data', protect, getCascadeData);
router.post('/states', protect, addState);
router.post('/categories', protect, addCategory);
router.post('/subcategories', protect, addSubcategory);
router.get("/projects",getProjects);
router.get('/projects/:projectId/categories', protectSuperAdmin, getProjectCategories);
router.get('/categories/:categoryId/subcategories', protectSuperAdmin, getSubcategoriesByCategory);

export default router;
