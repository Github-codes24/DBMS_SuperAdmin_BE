import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      unique: true,
      required: true,
    },
    vendorId: {
      type: String,
      default: '',
      trim: true,
    },
    srNo: {
      type: String,
      default: '',
    },
    fullName: {
      type: String,
      default: '',
      trim: true,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    password: {
      type: String,
      default: '',
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: '',
      trim: true,
    },
    subCategory: {
      type: String,
      default: '',
      trim: true,
    },
    // Matches the existing index: { mobileNumber: 1, isDeleted: 1 }
    mobileNumber: {
      type: String,
      default: '',
      trim: true,
    },
    whatsapp: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    state: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    locality: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    isPaidVendor: {
      type: Boolean,
      default: false,
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Active', 'Pending'],
      default: 'Active',
    },
    assignedTelecaller: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Search indexes
customerSchema.index({ companyName: 1, isDeleted: 1 });
customerSchema.index({ mobileNumber: 1, isDeleted: 1 });
customerSchema.index({ email: 1, isDeleted: 1 });
customerSchema.index({ customerId: 1, isDeleted: 1 });

const Customer = mongoose.model('SuperAdminCustomer', customerSchema, 'customers');
export default Customer;