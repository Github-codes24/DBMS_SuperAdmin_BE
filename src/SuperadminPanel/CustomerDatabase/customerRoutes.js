import express from 'express';
import multer from 'multer';
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  importCustomers,
  exportCustomersCSV,
  exportCustomersPDF,
  deleteCustomer
} from './customerController.js';
import { protectSuperAdmin } from '../Authentication/authMiddleware.js';

// Configure Multer Memory Storage for 50MB Direct Excel/CSV File Uploads (Supports any field name)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router = express.Router();

// Export Data Endpoints (CSV & PDF)
router.get('/export/csv', protectSuperAdmin, exportCustomersCSV);
router.get('/export/pdf', protectSuperAdmin, exportCustomersPDF);

// Bulk Import Endpoint (Supports Direct Excel .xlsx/.xls/.csv File Upload OR JSON Payload)
router.post('/import', protectSuperAdmin, upload.any(), importCustomers);

// Directory Listing & Manual Customer Creation
router
  .route('/')
  .get(protectSuperAdmin, getCustomers)
  .post(protectSuperAdmin, createCustomer);

// Update Customer & Status Protection Rule
router.patch('/:id', protectSuperAdmin, updateCustomer);

// Delete Customer.
router.delete(
  '/:id',
  protectSuperAdmin,
  deleteCustomer
);

export default router;
