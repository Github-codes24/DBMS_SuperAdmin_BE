import mongoose from "mongoose";

const authSchema = new mongoose.Schema(
  {
    vendorId: {
      type: String,
      unique: true,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: "",
    },
    designation: {
      type: String,
      default: "",
    },
    regionalJurisdiction: {
      type: String,
      default: "",
    },
    password: {
      type: String,
      required: false,
      default: "",
    },
    storeName: {
      type: String,
      required: true,
    },
    storeStatus: {
      type: String,
      default: "Pending Verification",
    },
    twoFactorAuth: {
      type: Boolean,
      default: false,
    },
    emailAlerts: {
      type: Boolean,
      default: false,
    },
    syncFrequency: {
      type: String,
      default: "Real-Time (Instant)",
    },
    avatar: {
      type: String,
      default: "",
    },
    whatsapp: {
      type: String,
      default: "",
    },
    isPaidVendor: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },
    state: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    locality: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },

    // --- Newly Added Fields ---
    alternateContact: { type: String, default: "" },
    website: { type: String, default: "" },
    listingType: { type: String, default: "" },
    paymentTerm: { type: String, default: "" },
    packageAmount: { type: String, default: "" }, // String avoids cast errors when frontend passes ""
    lastPayment: { type: String, default: "" }, // Use String or Date (if sanitized to null)
    nextDue: { type: String, default: "" }, // Use String or Date (if sanitized to null)
    invoiceNumber: { type: String, default: "" },

    category: {
      type: String,
      enum: [
        "",
        "Electrical & Electronics Repair",
        "Retail & Grocery Store",
        "Hardware & Sanitation",
        "Automobile & Garage",
      ],
      default: "",
    },
    specialization: {
      type: String,
      trim: true,
      default: "",
    },
    keywords: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

const Vendor = mongoose.model("Vendor", authSchema);
export default Vendor;
