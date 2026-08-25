/**
 * Telecaller CRM — TelecallerProfile Model
 * Stores profile information specific to telecaller users.
 * Each record links to a Vendor (_id from authSchema) who has the TELECALLER role.
 */
import mongoose from 'mongoose';


const telecallerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    profileImage: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const TelecallerProfile = mongoose.model('TelecallerProfile', telecallerProfileSchema);
export default TelecallerProfile;
