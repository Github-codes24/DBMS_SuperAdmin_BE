import express from 'express';
import {
  getAuditLogs,
  exportAuditLogsCSV,
  exportAuditLogsPDF,
} from './auditLogController.js';
import { protectSuperAdmin } from '../Authentication/authMiddleware.js';

const router = express.Router();

// Export Data Endpoints (CSV & PDF)
router.get('/export/csv', protectSuperAdmin, exportAuditLogsCSV);
router.get('/export/pdf', protectSuperAdmin, exportAuditLogsPDF);

// Directory Listing (Read-only System Audit Logs)
router.get('/', protectSuperAdmin, getAuditLogs);

export default router;
