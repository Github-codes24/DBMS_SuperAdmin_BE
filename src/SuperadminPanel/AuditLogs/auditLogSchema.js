import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: String, // e.g. 'ADM001', 'ADM002', 'SUPER', 'TC014'
      required: true,
      trim: true,
    },
    userName: {
      type: String,
      default: '',
      trim: true,
    },
    userRole: {
      type: String,
      default: 'SUPER_ADMIN',
      trim: true,
    },
    action: {
      type: String, // e.g. 'Updated Customer', 'Updated Vendor', 'Disabled Admin', 'Exported CSV', 'Changed Password'
      required: true,
      trim: true,
    },
    record: {
      type: String, // e.g. 'CUST1023', 'VEN0092', 'ADM003', 'CUST_LIST', 'TC031'
      required: true,
      trim: true,
    },
    module: {
      type: String,
      default: 'General',
      trim: true,
    },
    ipAddress: {
      type: String,
      default: '',
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Search indexes
auditLogSchema.index({ user: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ record: 1 });
auditLogSchema.index({ timestamp: -1 });

const AuditLog = mongoose.model('SuperAdminAuditLog', auditLogSchema);
export default AuditLog;
