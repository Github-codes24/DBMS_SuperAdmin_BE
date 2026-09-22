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
  activateVendor
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


// Get Single Vendor & Update Vendor (Accepts MongoDB _id, custom vendorId 'VEN002', or transNo 'TRX90102')
router
  .route('/:id')
  .get(protectSuperAdmin, getVendorById)
  .patch(protectSuperAdmin, updateVendor);

export default router;
