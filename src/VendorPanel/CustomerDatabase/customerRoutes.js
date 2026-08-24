import express from 'express';
import {
  getCustomers,
  updateCustomer,
  exportCustomersCSV,
} from './customerController.js';
import { protect } from '../Authentication/authMiddleware.js';

const router = express.Router();

router.get('/export-csv', protect, exportCustomersCSV);
router.get('/', protect, getCustomers);
router.put('/:customerId', protect, updateCustomer);

export default router;
