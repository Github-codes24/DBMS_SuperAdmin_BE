import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const telecallerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    employeeId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["TELECALLER"],
      default: "TELECALLER",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "PENDING", "Pending", "Active", "Inactive", "BLOCKED", "Blocked", "Disabled", "DISABLED"],
      default: "PENDING",
    },
    profileImage: {
      type: String,
      default: "",
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    createdByVendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },
  },
  { timestamps: true }
);

// Hash password before save (skip if already hashed with bcrypt)
telecallerSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) return;

  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password
telecallerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("Telecaller", telecallerSchema);
