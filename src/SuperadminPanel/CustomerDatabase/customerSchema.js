import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    // ==========================================
    // 1. VENDOR PERSONAL INFORMATION
    // ==========================================

    customerId: {
      type: String,
      unique: true,
     
    },

    // Vendor Code
    vendorCode: {
      type: String,
      default: '',
      trim: true,
    },

    // Keep this for compatibility with existing code/indexes
    vendorId: {
      type: String,
      default: '',
      trim: true,
    },

    // Serial Number
    srNo: {
      type: String,
      default: '',
      trim: true,
    },

    // System Register Date
    registrationDate: {
      type: Date,
      default: Date.now,
    },

    // Vendor Name *
    vendorName: {
      type: String,
   
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

    // Keep for compatibility with existing main code
    fullName: {
      type: String,
      default: '',
      trim: true,
    },

    companyName: {
      type: String,
  
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
    // Matches the existing index: { mobileNumber: 1, isDeleted: 1}

    // Country Name
    country: {
      type: String,
      default: 'India',
      trim: true,
    },

    // State Name
    state: {
      type: String,
      default: '',
      trim: true,
    },

    // City Name
    city: {
      type: String,
      default: '',
      trim: true,
    },

    // Locality
    locality: {
      type: String,
      default: '',
      trim: true,
    },

    // Email
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },

    // GST Number
    gstNumber: {
      type: String,
      default: '',
      trim: true,
    },

    // Address
    address: {
      type: String,
      default: '',
      trim: true,
    },

    // ==========================================
    // 2. UPLOAD IMAGE
    // ==========================================

    image: {
      type: String,
      default: '',
      trim: true,
    },

    // ==========================================
    // 3. CONTACT AND PAYMENT INFORMATION
    // ==========================================

    // Registered Phone No. (Locked) *
    registeredPhoneNo: {
      type: String,
    
      trim: true,
    },

    // Keep mobileNumber for compatibility with existing main code/index
    mobileNumber: {
      type: String,
      default: '',
      trim: true,
    },

    // Whatsapp No.
    whatsappNo: {
      type: String,
      default: '',
      trim: true,
    },

    // Keep existing main field
    whatsapp: {
      type: String,
      default: '',
      trim: true,
    },

    // Alternate Contact No.
    alternateContactNo: {
      type: String,
      default: '',
      trim: true,
    },

    // Website
    website: {
      type: String,
      default: '',
      trim: true,
    },

    // Vendor Listing Type
    vendorListingType: {
      type: String,
      enum: ['Not-Verified', 'Verified', 'Premium'],
      default: 'Not-Verified',
    },

    // Is Paid Vendor
    isPaidVendor: {
      type: String,
      enum: ['Yes', 'No'],
      default: 'No',
    },

    // Package Paid Amount
    packagePaidAmount: {
      type: Number,
      default: 0,
    },

    // Last Payment Date
    lastPaymentDate: {
      type: Date,
      default: null,
    },

    // Payment Term
    paymentTerm: {
      type: String,
      enum: ['Monthly', 'Quarterly', 'Yearly', 'One-time'],
      default: null,
    },

    // Last Payment Invoice No.
    lastPaymentInvoiceNo: {
      type: String,
      default: '',
      trim: true,
    },

    // Next Payment Due Date
    nextPaymentDueDate: {
      type: Date,
      default: null,
    },

    // Active Package List
    activePackageList: {
      type: String,
      default: '',
      trim: true,
    },

    // Created By / Telecaller
    createdByTelecaller: {
      type: String,
      default: '',
      trim: true,
    },

    // ==========================================
    // 4. VENDOR CATEGORY DETAILS
    // ==========================================

    primaryBusinessCategory: {
      type: String,
      enum: [
        'Electrical & Electronics Repair',
        'Grocery & FMCG',
        'Electronics & IT',
        'Medical & Pharma',
        'Home Products & Kitchenware',
        'Hardware & Tools',
        'Fashion & Apparel',
      ],
      default: null,
    },

    serviceSpecialization: {
      type: String,
      default: '',
      trim: true,
    },

    keywordsTags: {
      type: [String],
      default: [],
    },

    // ==========================================
    // CUSTOMER STATUS / AUDIT
    // ==========================================

    status: {
      type: String,
      enum: ['Active', 'Pending', 'Blocked', 'Rejected'],
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
  {
    timestamps: true,
  }
);

customerSchema.index({ companyName: 1, isDeleted: 1 });
customerSchema.index({ mobileNumber: 1, isDeleted: 1 });
customerSchema.index({ email: 1, isDeleted: 1 });
customerSchema.index({ status: 1, isDeleted: 1 });
customerSchema.index({ customerId: 1, isDeleted: 1 });

const Customer = mongoose.model(
  'SuperAdminCustomer',
  customerSchema,
  'customers'
);

export default Customer;