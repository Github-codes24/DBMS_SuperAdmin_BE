import express from 'express';
import {
  getActiveAdminUsers,
  getAdminFeatureControl,
  updateAdminFeatureControl,
} from './featureControlController.js';
import { protectSuperAdmin } from '../Authentication/authMiddleware.js';

const router = express.Router();

// Get Active Admin Users List (Selector Bar)
router.get('/admin-users', protectSuperAdmin, getActiveAdminUsers);

// Get & Update Feature Control Settings for a Specific Admin User
router
  .route('/admin-users/:userId')
  .get(protectSuperAdmin, getAdminFeatureControl)
  .put(protectSuperAdmin, updateAdminFeatureControl);

export default router;
