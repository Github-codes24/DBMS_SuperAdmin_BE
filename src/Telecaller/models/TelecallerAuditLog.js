/**
 * Telecaller CRM — TelecallerAuditLog Model
 * Immutable audit trail for all mutations performed by telecallers
 * on vendor records. Records before/after state for full traceability.
 */
import mongoose from 'mongoose';


const telecallerAuditLogSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      required: true,
      trim: true,
      // e.g. 'Vendor', 'Payment', 'Followup', 'Category', 'Contact'
    },
    action: {
      type: String,
      required: true,
      trim: true,
      // e.g. 'UPDATE_PERSONAL', 'UPDATE_CATEGORY', 'CREATE_FOLLOWUP', 'UPLOAD_IMAGE'
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor', // Telecaller user
      required: true,
    },
    oldData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const TelecallerAuditLog = mongoose.model('TelecallerAuditLog', telecallerAuditLogSchema);
export default TelecallerAuditLog;
