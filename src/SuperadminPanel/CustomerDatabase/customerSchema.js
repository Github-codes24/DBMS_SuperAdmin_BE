import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      unique: true,
      required: true,
    },
    srNo: {
      type: String,
      default: '',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },

    companyName: {
      type: String,
      required: true,
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

const Customer = mongoose.model('SuperAdminCustomer', customerSchema,'customers');
export default Customer;