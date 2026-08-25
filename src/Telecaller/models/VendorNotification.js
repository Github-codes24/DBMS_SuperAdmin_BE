/**
 * Telecaller CRM — VendorNotification Model
 * Logs every notification sent to a vendor or their customers,
 * including channel, delivery status, and sender details.
 */
import mongoose from 'mongoose';


const vendorNotificationSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      trim: true,
      default: '',
    },
    channel: {
      type: String,
      enum: ['SMS', 'EMAIL', 'WHATSAPP'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    deliveryStatus: {
      type: String,
      enum: ['Delivered', 'Pending', 'Failed'],
      default: 'Pending',
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor', // Telecaller who triggered the notification
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const VendorNotification = mongoose.model('VendorNotification', vendorNotificationSchema);
export default VendorNotification;
