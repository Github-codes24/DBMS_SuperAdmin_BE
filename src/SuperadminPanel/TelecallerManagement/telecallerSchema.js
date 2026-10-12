import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const telecallerSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // e.g. TC014, TC021, TC050
      unique: true,
      required: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full Name is required'],
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile Number is required'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email Address is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Initial Password is required'],
      select: false,
    },
    assignedRegion: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'DISABLED', 'Active', 'Disabled','BLOCKED','Blocked'],
      default: 'Active',
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

// Encrypt password before saving
telecallerSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match password method
telecallerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Search indexes
telecallerSchema.index({ fullName: 1, isDeleted: 1 });
telecallerSchema.index({ userId: 1, isDeleted: 1 });
telecallerSchema.index({ mobileNumber: 1, isDeleted: 1 });
telecallerSchema.index({ email: 1, isDeleted: 1 });

const Telecaller = mongoose.model('SuperAdminTelecaller', telecallerSchema);
export default Telecaller;
