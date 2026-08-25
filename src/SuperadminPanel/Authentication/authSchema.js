import mongoose from 'mongoose';

const authSchema = new mongoose.Schema(
  {
    adminId: {
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
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: 'SuperAdmin',
    },
    status: {
      type: String,
      default: 'Active',
    },
    avatar: {
      type: String,
      default: '',
    },
    resetOtp: {
      type: String,
      default: null,
    },
    resetOtpExpires: {
      type: Date,
      default: null,
    },
    isOtpVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const SuperAdmin = mongoose.model('SuperAdmin', authSchema);
export default SuperAdmin;
