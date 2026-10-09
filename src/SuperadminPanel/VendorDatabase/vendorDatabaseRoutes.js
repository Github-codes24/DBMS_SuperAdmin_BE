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
  blockVendor

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

// Directory Listing & Manual Vendor Creation
router
  .route('/')
  .get(protectSuperAdmin, getVendors)
  .post(protectSuperAdmin, createVendor);
 
  // GENERATE VENDOR ID AND PASSWORD DURING ACTIVATION OF ACCOUNT 
  router.patch(
    '/:vendorId/activate',
    protectSuperAdmin,
    activateVendor
  );
  // Change Password Of The Vendor
  router.patch(
    '/:vendorId/password',
    protectSuperAdmin,
    changeVendorPassword
  );
  // Delete Vendor
  router.delete(
    '/:vendorId',
    protectSuperAdmin,
    deleteVendor
  );
  // Block Vendor 
  router.patch(
    '/:vendorId/block',
    protectSuperAdmin,
    blockVendor
  )
  // Search Vendor's Based on state , city and name
  router.get(
    '/search',
    protectSuperAdmin,
    searchVendors
  );
  // Dynamic Form Field's
  router.get(
    '/form-fields',
    protectSuperAdmin,
    getVendorFormFields
  );
  router.post(
    '/form-fields',
    protectSuperAdmin,
    createVendorFormField
  );
  router.patch(
    '/form-fields/:fieldId',
    protectSuperAdmin,
    updateVendorFormField
  );
  router.delete(
    '/form-fields/:fieldId',
    protectSuperAdmin,
    deleteVendorFormField
  );

// Get Single Vendor & Update Vendor (Accepts MongoDB _id, custom vendorId 'VEN002', or transNo 'TRX90102')
router
  .route('/:id')
  .get(protectSuperAdmin, getVendorById)
  .patch(protectSuperAdmin, updateVendor);



export default router;
