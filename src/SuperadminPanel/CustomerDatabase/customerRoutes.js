import express from 'express';
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  importCustomers,
  exportCustomersCSV,
  exportCustomersPDF,
} from './customerController.js';
import { protectSuperAdmin } from '../Authentication/authMiddleware.js';

const router = express.Router();

// Export Data Endpoints (CSV & PDF)
router.get('/export/csv', protectSuperAdmin, exportCustomersCSV);
router.get('/export/pdf', protectSuperAdmin, exportCustomersPDF);

// Bulk Import Endpoint (Excel/CSV parsed payload)
router.post('/import', protectSuperAdmin, importCustomers);

// Directory Listing & Manual Customer Creation
router
  .route('/')
  .get(protectSuperAdmin, getCustomers)
  .post(protectSuperAdmin, createCustomer);

// Update Customer & Status Protection Rule
router.patch('/:id', protectSuperAdmin, updateCustomer);

export default router;
