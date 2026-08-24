import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from './notificationController.js';
import { protect } from '../Authentication/authMiddleware.js';

const router = express.Router();

router.patch('/read-all', protect, markAllAsRead);
router.get('/', protect, getNotifications);
router.patch('/:id/read', protect, markAsRead);

export default router;
