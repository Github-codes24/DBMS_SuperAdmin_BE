import express from 'express';
import multer from 'multer';
import {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  importVendors,
  exportVendorsCSV,
  exportVendorsPDF,
  searchVendors,
  activateVendor,
  createVendorFormField,
  getVendorFormFields,
  updateVendorFormField,
  deleteVendorFormField,
  changeVendorPassword,
  deleteVendor,
  bulkUpdateVendorStatuses,
  bulkDeleteVendors,
  blockVendor,
  unblockVendor,
} from './vendorDatabaseController.js';
import { protectSuperAdmin } from '../Authentication/authMiddleware.js';

// Configure Multer Memory Storage for 50MB Direct Excel/CSV File Uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router = express.Router();

// Export Data Endpoints (CSV & PDF)
router.get('/export/csv', protectSuperAdmin, exportVendorsCSV);
router.get('/export/pdf', protectSuperAdmin, exportVendorsPDF);

// Bulk Import Endpoint (Supports Direct Excel .xlsx/.xls/.csv File Upload OR JSON Payload)
router.post('/import', protectSuperAdmin, upload.any(), importVendors);

// Directory Listing & Manual Vendor Creation (ONLY Super Admin can create vendors)
router
  .route('/')
  .get(protectSuperAdmin, getVendors)
  .post(protectSuperAdmin, createVendor);

router.patch('/bulk-status', protectSuperAdmin, bulkUpdateVendorStatuses);
router.patch('/bulk-delete', protectSuperAdmin, bulkDeleteVendors);

// Search Vendors Based on state, city, and name
router.get('/search', protectSuperAdmin, searchVendors);

// Dynamic Form Fields
router.get('/form-fields', protectSuperAdmin, getVendorFormFields);
router.post('/form-fields', protectSuperAdmin, createVendorFormField);
router.patch('/form-fields/:fieldId', protectSuperAdmin, updateVendorFormField);
router.delete('/form-fields/:fieldId', protectSuperAdmin, deleteVendorFormField);

// Activate Vendor by SuperAdmin only (Accepts MongoDB _id, custom vendorId 'VEN001', or transNo)
router.patch('/:vendorId/activate', protectSuperAdmin, activateVendor);
router.patch('/:id/activate', protectSuperAdmin, activateVendor);

// Change Password Of The Vendor (Accepts :vendorId or :id)
router.patch('/:vendorId/password', protectSuperAdmin, changeVendorPassword);
/**
 * @desc    Change a vendor's password (Super Admin only)
 * @route   PATCH /api/v1/superadmin/vendors/:id/password
 * @example https://lts-dbms-backend.onrender.com/api/v1/superadmin/vendors/VendorId/change-password
 * @access  Private (Super Admin token required)
 * **/
router.patch('/:id/change-password', protectSuperAdmin, changeVendorPassword);

// Block & Unblock Vendor
router.patch('/:vendorId/block', protectSuperAdmin, blockVendor);
router.patch('/:id/block', protectSuperAdmin, blockVendor);
router.patch('/:vendorId/unblock', protectSuperAdmin, unblockVendor);
router.patch('/:id/unblock', protectSuperAdmin, unblockVendor);

// Delete Vendor (Soft delete)
router.delete('/:vendorId', protectSuperAdmin, deleteVendor);
router.delete('/:id', protectSuperAdmin, deleteVendor);

// Get Single Vendor & Update Vendor (Accepts MongoDB _id, custom vendorId 'VEN002', or transNo 'TRX90102')
router
  .route('/:id')
  .get(protectSuperAdmin, getVendorById)
  .patch(protectSuperAdmin, updateVendor);

export default router;
