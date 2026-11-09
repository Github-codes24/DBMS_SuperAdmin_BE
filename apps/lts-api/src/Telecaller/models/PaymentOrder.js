/**
 * Telecaller CRM — PaymentOrder Model
 * Stores Razorpay payment orders created by telecallers for vendors.
 * Tracks package breakdown, GST, discounts, and payment status lifecycle.
 */
import mongoose from 'mongoose';


const packageItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
);

const paymentOrderSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    telecallerId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    gateway: {
      type: String,
      default: 'Razorpay',
      trim: true,
    },
    packages: {
      type: [packageItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100, // Percentage
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    gstRate: {
      type: Number,
      default: 18,
    },
    gstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    // Razorpay-specific fields
    razorpayOrderId: {
      type: String,
      default: '',
    },
    paymentLink: {
      type: String,
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Expired'],
      default: 'Pending',
    },
  },
  { timestamps: true }
);

const PaymentOrder = mongoose.model('PaymentOrder', paymentOrderSchema);
export default PaymentOrder;
