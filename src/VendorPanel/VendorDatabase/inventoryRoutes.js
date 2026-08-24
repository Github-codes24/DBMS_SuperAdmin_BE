import express from 'express';
import {
  getInventory,
  updateInventory,
  exportInventoryCSV,
} from './inventoryController.js';
import { protect } from '../Authentication/authMiddleware.js';

const router = express.Router();

router.get('/export-csv', protect, exportInventoryCSV);
router.get('/', protect, getInventory);
router.put('/:sku', protect, updateInventory);

export default router;
