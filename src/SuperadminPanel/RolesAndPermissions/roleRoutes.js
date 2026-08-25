import express from 'express';
import {
  getAllRoles,
  createRole,
  getRolePermissions,
  updateRolePermissions,
  quickActionPermissions,
} from './roleController.js';
import { protectSuperAdmin } from '../Authentication/authMiddleware.js';

const router = express.Router();

// Get All Roles & Create New Role
router
  .route('/')
  .get(protectSuperAdmin, getAllRoles)
  .post(protectSuperAdmin, createRole);

// Get & Update Permissions Matrix for a specific Role
router
  .route('/:roleId/permissions')
  .get(protectSuperAdmin, getRolePermissions)
  .put(protectSuperAdmin, updateRolePermissions);

// Quick Actions (Grant All, Revoke All, Reset)
router.post('/:roleId/permissions/quick-action', protectSuperAdmin, quickActionPermissions);

export default router;
