import mongoose from "mongoose";

const durationOptionSchema = new mongoose.Schema(
  {
    duration: { type: Number },
    durationInMonths: { type: Number },
    price: { type: String },
    gst: { type: Number, default: 0 },
    leads: { type: String, default: "0" },
    totalPayable: { type: Number },
    features: [{ type: String }],
  },
  { _id: true }
);

const planSchema = new mongoose.Schema(
  {
    // Live / exported fields
    category: { type: String, trim: true },
    subCategory: { type: String, trim: true },
    description: { type: String, default: "", trim: true },
    durations: [durationOptionSchema],
    features: [{ type: String }],
    image: { type: String, default: "" },
    isDelete: { type: Boolean, default: false },

    // Legacy fields (optional, for backwards compatibility)
    planId: { type: String, trim: true, index: true },
    name: { type: String, trim: true },
    code: { type: String, trim: true, uppercase: true },
    duration: { type: String, trim: true },
    durationInMonths: { type: Number },
    price: { type: Number },
    originalPrice: { type: Number },
    discount: { type: Number, default: 0 },
    finalAmount: { type: Number },
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  {
    strict: false,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: provide a unified name for the plan (e.g., "PLAN Silver" or "Silver")
planSchema.virtual("displayName").get(function () {
  if (this.name) return this.name;
  if (this.subCategory && this.category) {
    return `${this.category} ${this.subCategory}`;
  }
  return this.subCategory || this.category || "Subscription Plan";
});

const Plan = mongoose.models.Plan || mongoose.model("Plan", planSchema);
export default Plan;
