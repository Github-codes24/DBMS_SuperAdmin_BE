import express from 'express';
import {
  getTickets,
  getTicketById,
  createTicket,
  addReply,
} from './supportController.js';
import { protect } from '../Authentication/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getTickets)
  .post(protect, createTicket);

router.get('/:ticketId', protect, getTicketById);
router.post('/:ticketId/replies', protect, addReply);

export default router;
