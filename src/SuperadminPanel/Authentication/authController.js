import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import SuperAdmin from './authSchema.js';
import { createAuditLog } from '../../utils/auditLogger.js';

// Helper to generate Access Token (24 Hours for stable testing & development)
const generateAccessToken = (id) => {
  return jwt.sign({ id, role: 'SuperAdmin' }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '24h',
  });
};

// Helper to generate Refresh Token (long-lived - 7 days)
const generateRefreshToken = (id) => {
  return jwt.sign({ id, role: 'SuperAdmin' }, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret', {
    expiresIn: '7d',
  });
};

// Cookie Options Helper (Strict sameSite, HTTP-only, secure in production)
const getCookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: maxAgeMs,
});

// Helper to generate 6-digit OTP
const generateSixDigitOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};


// LOGIN API
// @desc    Authenticates active user & issues access and refresh tokens
// @route   POST /api/v1/auth/login
// @access  Public
export const loginSuperAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide Email and Password' });
    }

    const admin = await SuperAdmin.findOne({ email: email.toLowerCase() });

    if (!admin) {
      return res.status(401).json({ message: 'Invalid Email or Password' });
    }

    // Account must exist, must not be deleted and must have ACTIVE status
    if (admin.status !== 'Active') {
      return res.status(403).json({ message: 'Account is not active or has been disabled' });
    }

    // Password comparison
    const isPasswordMatch = await bcrypt.compare(password, admin.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid Email or Password' });
    }

    // Access token and refresh token generation
    const accessToken = generateAccessToken(admin._id);
    const refreshToken = generateRefreshToken(admin._id);

    admin.refreshToken = refreshToken;
    await admin.save();

    // Automatic Audit Log Recording
    await createAuditLog({
      user: admin.adminId || 'SUPER',
      userName: admin.fullName || 'Super Admin',
      userRole: admin.role || 'SUPER_ADMIN',
      action: 'User Login',
      record: 'SUPER_ADMIN_PANEL',
      module: 'Authentication',
    });

    // Tokens handled through HTTP-only cookies
    res.cookie('accessToken', accessToken, getCookieOptions(24 * 60 * 60 * 1000));
    res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.json({
      message: 'Login successful',
      user: {
        _id: admin._id,
        adminId: admin.adminId,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        status: admin.status,
        avatar: admin.avatar,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// FORGOT PASSWORD API
// @desc    Generates a 6-digit OTP and sends it to the user's email
// @route   POST /api/v1/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Please provide Email address' });
    }

    const admin = await SuperAdmin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(404).json({ message: 'No registered user found with this email' });
    }

    // Generate 6-digit OTP and set 10 minute expiry
    const otp = generateSixDigitOtp();
    admin.resetOtp = otp;
    admin.resetOtpExpires = Date.now() + 10 * 60 * 1000;
    admin.isOtpVerified = false;
    await admin.save();

    // Send OTP to email (mock return for dev testing)
    res.json({
      message: 'OTP sent to registered email address successfully',
      email: admin.email,
      otp: otp, // Dev preview
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// VERIFY OTP API

// @desc    Verifies the password-reset OTP
// @route   POST /api/v1/auth/verify-otp
// @access  Public
export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      return res.status(400).json({ message: 'Please provide Email and OTP' });
    }

    const admin = await SuperAdmin.findOne({
      email: email.toLowerCase(),
      resetOtp: otp,
      resetOtpExpires: { $gt: Date.now() },
    });

    if (!admin) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Process: OTP verified, isOtpVerified set to true, OTP cleared
    admin.isOtpVerified = true;
    admin.resetOtp = null;
    admin.resetOtpExpires = null;
    await admin.save();

    res.json({ message: 'OTP verified successfully. You can now reset your password.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// RESEND OTP API
// @desc    Generates and sends a new password-reset OTP
// @route   POST /api/v1/auth/resend-otp
// @access  Public
export const resendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Please provide Email address' });
    }

    const admin = await SuperAdmin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(404).json({ message: 'No registered user found with this email' });
    }

    const newOtp = generateSixDigitOtp();
    admin.resetOtp = newOtp;
    admin.resetOtpExpires = Date.now() + 10 * 60 * 1000;
    admin.isOtpVerified = false;
    await admin.save();

    res.json({
      message: 'New OTP sent to registered email address successfully',
      email: admin.email,
      otp: newOtp, // Dev preview
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// RESET PASSWORD API
// @desc    Resets the password after successful OTP verification
// @route   POST /api/v1/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;

  try {
    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Please provide Email, New Password, and Confirm Password' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password do not match' });
    }

    const admin = await SuperAdmin.findOne({ email: email.toLowerCase() });

    if (!admin) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Process: Password updated ONLY after OTP verification
    if (!admin.isOtpVerified) {
      return res.status(400).json({ message: 'OTP must be verified before resetting password' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);

    // Process: Stored refresh token is invalidated & OTP verified status cleared
    admin.refreshToken = null;
    admin.isOtpVerified = false;
    await admin.save();

    res.json({ message: 'Password reset successfully. Please log in again with your new password.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// REFRESH TOKEN API
// @desc    Validates refresh token and issues a new access/refresh token pair
// @route   POST /api/v1/auth/refresh-token
// @access  Public (Refresh Token in cookie or body)
export const refreshAccessToken = async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!token) {
    return res.status(401).json({ message: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret');
    const admin = await SuperAdmin.findById(decoded.id);

    if (!admin || admin.refreshToken !== token) {
      return res.status(403).json({ message: 'Invalid or expired refresh token' });
    }

    const newAccessToken = generateAccessToken(admin._id);
    const newRefreshToken = generateRefreshToken(admin._id);

    admin.refreshToken = newRefreshToken;
    await admin.save();

    res.cookie('accessToken', newAccessToken, getCookieOptions(24 * 60 * 60 * 1000));
    res.cookie('refreshToken', newRefreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

// LOGOUT API
// @desc    Invalidates stored refresh token and clears authentication cookies
// @route   POST /api/v1/auth/logout
// @access  Private (JWT Required)
export const logoutSuperAdmin = async (req, res) => {
  try {
    if (req.superAdmin) {
      req.superAdmin.refreshToken = null;
      await req.superAdmin.save();
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// GET CURRENT USER API
// @desc    Returns the currently authenticated user's details
// @route   GET /api/v1/auth/me OR GET /api/v1/auth/profile
// @access  Private (JWT Required)
export const getCurrentUser = async (req, res) => {
  try {
    const admin = await SuperAdmin.findById(req.superAdmin._id).select(
      '-password -resetOtp -resetOtpExpires -refreshToken -isOtpVerified'
    );
    if (admin) {
      res.json(admin);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
