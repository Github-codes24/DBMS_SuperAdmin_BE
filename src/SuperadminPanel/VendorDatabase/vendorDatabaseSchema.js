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
      unique:true
    },
    ownerName: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      required: false,
      default: '',
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
    password: {
      type: String,
      default: '',
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
      enum: ['ACTIVE', 'PENDING', 'Active', 'Pending','Blocked','blocked'],
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
    customFields: [
      {
        fieldId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'VendorFormField',
          required: true,
        },
    
        value: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
      },
    ],
  },
  { timestamps: true }
);
// Search indexes
superAdminVendorSchema.index(
  { vendorName: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false }
  }
);
superAdminVendorSchema.index({ transNo: 1, isDeleted: 1 });
superAdminVendorSchema.index({ vendorId: 1, isDeleted: 1 });
superAdminVendorSchema.index({ category: 1, isDeleted: 1 });
superAdminVendorSchema.index({ ownerName: 1, isDeleted: 1 });
superAdminVendorSchema.index({ state: 1, city: 1, isDeleted: 1 });
superAdminVendorSchema.index({ email: 1 }, { unique: true, partialFilterExpression: {
 email: { $type: "string", $gt: "" },
  },
  }
);
const SuperAdminVendor = mongoose.model('SuperAdminVendor', superAdminVendorSchema);
const vendorFormFieldSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        'TEXT',
        'NUMBER',
        'EMAIL',
        'DATE',
        'DROPDOWN',
        'CHECKBOX',
        'TOGGLE',
        'TEXTAREA',
      ],
    },

    required: {
      type: Boolean,
      default: false,
    },

    placeholder: {
      type: String,
      default: '',
      trim: true,
    },

    // Used only when type is DROPDOWN
    options: {
      type: [String],
      default: [],
    },

    // Soft delete
    isActive: {
      type: Boolean,
      default: true,
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
  },
  {
    timestamps: true,
  }
);

vendorFormFieldSchema.index({ isActive: 1 });

const VendorFormField = mongoose.model(
  'VendorFormField',
  vendorFormFieldSchema
);

export { VendorFormField };
export default SuperAdminVendor;