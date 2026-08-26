import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Vendor from './authSchema.js';

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Auth vendor & get token
// @route   POST /api/auth/login
// @access  Public
export const loginVendor = async (req, res) => {
  const { loginId, email, password } = req.body;
  const identifier = loginId || email;

  try {
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Please provide Email/Vendor ID and Password' });
    }

    // Find vendor by email OR vendorId (case-insensitive)
    const vendor = await Vendor.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { vendorId: identifier.trim() }
      ]
    });

    if (vendor && (await bcrypt.compare(password, vendor.password))) {
      res.json({
        _id: vendor._id,
        vendorId: vendor.vendorId,
        fullName: vendor.fullName,
        email: vendor.email,
        storeName: vendor.storeName,
        storeStatus: vendor.storeStatus,
        token: generateToken(vendor._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid Email/Vendor ID or Password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get currently logged in vendor profile
// @route   GET /api/auth/profile
// @access  Private
export const getVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.vendor._id).select('-password');
    if (vendor) {
      res.json(vendor);
    } else {
      res.status(404).json({ message: 'Vendor not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Logout vendor
// @route   POST /api/auth/logout
// @access  Private
export const logoutVendor = async (req, res) => {
  res.json({ message: 'Logged out successfully' });
};

