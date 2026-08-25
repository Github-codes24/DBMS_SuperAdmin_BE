import express from 'express';
import {
  searchVendorLookup,
  getVendorProfileDetail,
  exportDataManagementVendorsCSV,
  exportDataManagementVendorsPDF,
} from './dataManagementController.js';
import { protectSuperAdmin } from '../Authentication/authMiddleware.js';

const router = express.Router();

// Export Data Endpoints (CSV & PDF)
router.get('/export/csv', protectSuperAdmin, exportDataManagementVendorsCSV);
router.get('/export/pdf', protectSuperAdmin, exportDataManagementVendorsPDF);

// Search Vendors Lookup Directory (Filter by Vendor Code, Shop Name, State & City Dropdowns)
router.get('/vendors', protectSuperAdmin, searchVendorLookup);

// Particular Vendor Complete Profile Details Modal (Accepts MongoDB _id, custom vendorCode 'VEN001', transNo 'TRX90101', or email)
router.get('/vendors/:id', protectSuperAdmin, getVendorProfileDetail);

export default router;
