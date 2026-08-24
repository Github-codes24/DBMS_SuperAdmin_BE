import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    products: {
      type: String, // Stored as a detailed string description for easy display (e.g. "Organic Alphonso Mangoes (2x), Malabar Black Pepper (1x)")
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending', 'Failed'],
      default: 'Pending',
    },
    deliveryStatus: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    vendorId: {
      type: String,
      required: true,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;
