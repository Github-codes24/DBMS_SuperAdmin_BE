import mongoose from 'mongoose';

const vendorImageSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },

    image: {
      type: String,
      required: true,
    },

    isPrimary: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Telecaller',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const VendorImage = mongoose.model(
  'VendorImage',
  vendorImageSchema
);

export default VendorImage;