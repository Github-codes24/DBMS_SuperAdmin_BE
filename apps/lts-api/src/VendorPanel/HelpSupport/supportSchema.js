import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true, // "Vendor" or "Support Agent Name"
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const supportSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'Payout & Settlement',
        'Order Dispatch & Logistics',
        'Product Catalog Listing',
        'Account & Verification',
        'Technical Glitch',
      ],
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ['Low Priority', 'Medium Priority', 'High Priority', 'Urgent Priority'],
      default: 'Medium Priority',
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved'],
      default: 'Open',
    },
    assignedAgent: {
      type: String,
      default: 'Priya Sharma',
    },
    replies: [replySchema],
    vendorId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const SupportTicket = mongoose.model('SupportTicket', supportSchema);
export default SupportTicket;
