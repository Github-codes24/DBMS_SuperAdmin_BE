import mongoose from 'mongoose';

const adminFeatureControlSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    customerManagement: {
      type: Boolean,
      default: true,
    },
    vendorManagement: {
      type: Boolean,
      default: true,
    },
    reports: {
      type: Boolean,
      default: false,
    },
    exportData: {
      type: Boolean,
      default: true,
    },
    bulkUpload: {
      type: Boolean,
      default: false,
    },
    telecallerAssignment: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
      default: null,
    },
  },
  { timestamps: true }
);

const AdminFeatureControl = mongoose.model('AdminFeatureControl', adminFeatureControlSchema);
export default AdminFeatureControl;
