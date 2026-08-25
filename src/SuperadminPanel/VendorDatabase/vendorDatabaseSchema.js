import mongoose from 'mongoose';

const superAdminVendorSchema = new mongoose.Schema(
  {
    vendorId: {
      type: String,
      unique: true,
      required: true,
    },
    transNo: {
      type: String,
      unique: true,
      required: true,
    },
    srNo: {
      type: String,
      default: '',
    },
    vendorName: {
      type: String,
      required: true,
      trim: true,
    },
    ownerName: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    gstin: {
      type: String,
      default: '',
      trim: true,
    },
    verificationDateTime: {
      type: Date,
      default: Date.now,
    },
    contactNo: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
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
    pincode: {
      type: String,
      default: '',
      trim: true,
    },
    completeAddress: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PENDING', 'Active', 'Pending'],
      default: 'Pending',
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
superAdminVendorSchema.index({ vendorName: 1, isDeleted: 1 });
superAdminVendorSchema.index({ transNo: 1, isDeleted: 1 });
superAdminVendorSchema.index({ vendorId: 1, isDeleted: 1 });
superAdminVendorSchema.index({ category: 1, isDeleted: 1 });
superAdminVendorSchema.index({ ownerName: 1, isDeleted: 1 });
superAdminVendorSchema.index({ state: 1, city: 1, isDeleted: 1 });

const SuperAdminVendor = mongoose.model('SuperAdminVendor', superAdminVendorSchema);
export default SuperAdminVendor;
