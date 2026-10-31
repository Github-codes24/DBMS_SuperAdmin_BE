import express from 'express';
import multer from 'multer';
import {
  getTelecallers,
  getTelecallerById,
  createTelecaller,
  updateTelecaller,
  bulkUpdateTelecallerStatus,
  importTelecallers,
  exportTelecallersCSV,
  exportTelecallersPDF,
  blockTelecaller,
  unblockTelecaller,
  activateTelecaller,
} from './telecallerController.js';
import { protectSuperAdmin } from '../Authentication/authMiddleware.js';

// Configure Multer Memory Storage for 50MB Direct Excel/CSV File Uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router = express.Router();

// Export Data Endpoints (CSV & PDF)
router.get('/export/csv', protectSuperAdmin, exportTelecallersCSV);
router.get('/export/pdf', protectSuperAdmin, exportTelecallersPDF);

// Bulk Import Endpoint (Supports Direct Excel .xlsx/.xls/.csv File Upload OR JSON Payload)
router.post('/import', protectSuperAdmin, upload.any(), importTelecallers);

// Directory Listing & Manual Telecaller Creation
router
  .route('/')
  .get(protectSuperAdmin, getTelecallers)
  .post(protectSuperAdmin, createTelecaller);

router.patch('/bulk-status', protectSuperAdmin, bulkUpdateTelecallerStatus);

// Activate Telecaller from SuperAdmin (Accepts Mongo _id, custom userId/employeeId, email, or phone)
router.patch('/:telecallerId/activate', protectSuperAdmin, activateTelecaller);
router.patch('/:id/activate', protectSuperAdmin, activateTelecaller);

// Block / Unblock Telecaller from SuperAdmin
router.patch('/:telecallerId/block', protectSuperAdmin, blockTelecaller);
router.patch('/:id/block', protectSuperAdmin, blockTelecaller);
router.patch('/:telecallerId/unblock', protectSuperAdmin, unblockTelecaller);
router.patch('/:id/unblock', protectSuperAdmin, unblockTelecaller);

// Single Telecaller Profile & Manage Update Modal (Accepts MongoDB _id, custom userId 'TC014', email, or mobileNumber)
router
  .route('/:id')
  .get(protectSuperAdmin, getTelecallerById)
  .patch(protectSuperAdmin, updateTelecaller);

export default router;
