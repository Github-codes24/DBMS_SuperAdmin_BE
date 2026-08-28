import mongoose from 'mongoose';

const authSchema = new mongoose.Schema(
  {
    vendorId: {
      type: String,
      unique: true,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: '',
    },
    designation: {
      type: String,
      default: '',
    },
    regionalJurisdiction: {
      type: String,
      default: '',
    },
    password: {
      type: String,
      required: true,
    },
    storeName: {
      type: String,
      required: true,
    },
    storeStatus: {
      type: String,
      default: 'Active & Verified',
    },
    twoFactorAuth: {
      type: Boolean,
      default: false,
    },
    emailAlerts: {
      type: Boolean,
      default: false,
    },
    syncFrequency: {
      type: String,
      default: 'Real-Time (Instant)',
    },
    avatar: {
      type: String,
      default: '',
    },
    whatsapp: {
      type: String,
      default: '',
    },
    isPaidVendor: {
      type: Boolean,
      default: false,
    },
    state: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    locality: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const Vendor = mongoose.model('Vendor', authSchema);
export default Vendor;
