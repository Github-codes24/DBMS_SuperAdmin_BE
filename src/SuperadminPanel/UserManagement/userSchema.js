import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      unique: true,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'ADMIN', 'TELECALLER'],
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'BLOCKED'],
      default: 'ACTIVE',
    },
    permissions: {
      type: [String],
      default: [],
    },
    target: {
      type: Number,
      default: 0,
    },
    assignedLeads: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
      required: true,
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
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    otp: {
      type: String,
      default: null,
    },
    isOtpVerified: {
      type: Boolean,
      default: false,
    },
    otpExpireAt: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for non-deleted email and phone uniqueness
userSchema.index({ email: 1, isDeleted: 1 });
userSchema.index({ phone: 1, isDeleted: 1 });

const User = mongoose.model('User', userSchema);
export default User;
