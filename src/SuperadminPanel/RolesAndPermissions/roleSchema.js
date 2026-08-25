import mongoose from 'mongoose';

// Role Schema
const roleSchema = new mongoose.Schema(
  {
    roleId: {
      type: String,
      unique: true,
      required: true,
    },
    title: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    isMasterRole: {
      type: Boolean,
      default: false,
    },
    clonedFrom: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
      default: null,
    },
  },
  { timestamps: true }
);

// Permission Matrix Schema per Module
const permissionMatrixSchema = new mongoose.Schema(
  {
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
    },
    roleTitle: {
      type: String,
      required: true,
    },
    moduleKey: {
      type: String,
      required: true,
      enum: [
        'CUSTOMER_DATABASE',
        'VENDOR_DATABASE',
        'CUSTOMER_VENDOR_QUERIES',
        'ANALYTICS_REPORTS',
        'SYSTEM_AUDIT_LOGS',
        'USER_MANAGEMENT',
      ],
    },
    moduleName: {
      type: String,
      required: true,
    },
    moduleDescription: {
      type: String,
      default: '',
    },
    fullAccess: {
      type: Boolean,
      default: false,
    },
    viewAccess: {
      type: Boolean,
      default: false,
    },
    editAccess: {
      type: Boolean,
      default: false,
    },
    exportAccess: {
      type: Boolean,
      default: false,
    },
    deleteAccess: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index on roleId and moduleKey
permissionMatrixSchema.index({ roleId: 1, moduleKey: 1 }, { unique: true });

export const Role = mongoose.model('Role', roleSchema);
export const PermissionMatrix = mongoose.model('PermissionMatrix', permissionMatrixSchema);
