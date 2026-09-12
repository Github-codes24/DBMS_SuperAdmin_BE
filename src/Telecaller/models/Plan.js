import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    planId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    duration: {
      type: String,
      required: true, // e.g. "1 Month", "3 Months", "6 Months", "1 Year"
      trim: true,
    },
    durationInMonths: {
      type: Number,
      required: true, // e.g. 1, 3, 6, 12
    },
    price: {
      type: Number,
      required: true, // base price in INR
    },
    originalPrice: {
      type: Number, // alias/mirror for price
    },
    discount: {
      type: Number,
      default: 0, // discount percentage, e.g. 10 for 10%
      min: 0,
      max: 100,
    },
    finalAmount: {
      type: Number, // calculated discounted amount before GST
    },
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    isPopular: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save hook to calculate finalAmount and sync originalPrice
planSchema.pre('save', function () {
  if (this.originalPrice === undefined || this.originalPrice === null) {
    this.originalPrice = this.price;
  }
  const disc = this.discount || 0;
  this.finalAmount = parseFloat((this.price - (this.price * disc) / 100).toFixed(2));
});

const Plan = mongoose.model('Plan', planSchema);
export default Plan;
