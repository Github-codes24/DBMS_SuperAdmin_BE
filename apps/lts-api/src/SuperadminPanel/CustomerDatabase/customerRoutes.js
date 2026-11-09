import express from 'express';
import multer from 'multer';
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  updateCustomersBulk,
  importCustomers,
  exportCustomersCSV,
  exportCustomersPDF,
  deleteCustomer,
  blockCustomer,
  unblockCustomer
} from './customerController.js';
import { protectSuperAdmin } from '../Authentication/authMiddleware.js';
import createUploader from "../../utils/upload.js"

// Configure Multer Memory Storage for 50MB Direct Excel/CSV File Uploads (Supports any field name)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router = express.Router();
// Get refrence for the Create-Uploader.
const customerUpload = createUploader("customers");

// Export Data Endpoints (CSV & PDF)
router.get('/export/csv', protectSuperAdmin, exportCustomersCSV);
router.get('/export/pdf', protectSuperAdmin, exportCustomersPDF);

// Bulk Import Endpoint (Supports Direct Excel .xlsx/.xls/.csv File Upload OR JSON Payload)
router.post('/import', protectSuperAdmin, upload.any(), importCustomers);

// Directory Listing & Manual Customer Creation
router
  .route('/')
  .get(protectSuperAdmin, getCustomers)
  .post(protectSuperAdmin,
    customerUpload.single("image"),
     createCustomer);

router.patch('/bulk',
 protectSuperAdmin,
 updateCustomersBulk);

// Update Customer & Status Protection Rule
router.patch('/:id',
 protectSuperAdmin,
customerUpload.single("image"),
 updateCustomer);

 // Block Customer 
 router.patch('/:id/block',
 protectSuperAdmin,
  blockCustomer);

  // UnBlock Customer 
  router.patch('/:id/unblock',
 protectSuperAdmin,
  unblockCustomer);

// Delete Customer.
router.delete(
  '/:id',
  protectSuperAdmin,
  deleteCustomer
);

export default router;
