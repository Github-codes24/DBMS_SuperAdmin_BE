/**
 * Telecaller CRM — VendorFollowup Model
 * Tracks follow-up activities (calls, meetings, visits, payments, renewals)
 * performed by telecallers against specific vendors.
 */
import mongoose from 'mongoose';


const vendorFollowupSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    telecallerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor', // Telecaller is also a Vendor user
      required: true,
    },
    followupType: {
      type: String,
      enum: ['CALL', 'MEETING', 'VISIT', 'PAYMENT', 'RENEWAL'],
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'DONE', 'MISSED'],
      default: 'PENDING',
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    nextFollowupDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const VendorFollowup = mongoose.model('VendorFollowup', vendorFollowupSchema);
export default VendorFollowup;
