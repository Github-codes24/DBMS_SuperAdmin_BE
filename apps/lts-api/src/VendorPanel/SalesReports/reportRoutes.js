import express from 'express';
import {
  getReports,
  updateReport,
  exportReportsCSV,
} from './reportController.js';
import { protect } from '../Authentication/authMiddleware.js';

const router = express.Router();

router.get('/export-csv', protect, exportReportsCSV);
router.get('/', protect, getReports);
router.put('/:reportId', protect, updateReport);

export default router;
