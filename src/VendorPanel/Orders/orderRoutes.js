import express from 'express';
import {
  getOrders,
  getRecentOrders,
  getOrderById,
  updateDeliveryStatus,
  exportOrdersCSV,
} from './orderController.js';
import { protect } from '../Authentication/authMiddleware.js';

const router = express.Router();

router.get('/export-csv', protect, exportOrdersCSV);
router.get('/recent', protect, getRecentOrders);
router.get('/', protect, getOrders);
router.get('/:orderId', protect, getOrderById);
router.patch('/:orderId/delivery-status', protect, updateDeliveryStatus);

export default router;
