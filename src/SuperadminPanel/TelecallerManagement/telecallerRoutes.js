import express from 'express';
import multer from 'multer';
import {
  getTelecallers,
  getTelecallerById,
  createTelecaller,
  updateTelecaller,
  importTelecallers,
  exportTelecallersCSV,
  exportTelecallersPDF,
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

// Single Telecaller Profile & Manage Update Modal (Accepts MongoDB _id, custom userId 'TC014', email, or mobileNumber)
router
  .route('/:id')
  .get(protectSuperAdmin, getTelecallerById)
  .patch(protectSuperAdmin, updateTelecaller);

export default router;
