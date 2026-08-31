import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import SuperAdmin from './authSchema.js';
import { createAuditLog } from '../../utils/auditLogger.js';
import { sendSmsOtp } from '../../utils/sendSms.js';

// Helper to generate Access Token (8 Hours)
const generateAccessToken = (id) => {
  return jwt.sign({ id, role: 'SuperAdmin' }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '8h',
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


// SEND LOGIN OTP API
// @desc    Checks if registered active SuperAdmin exists for phone and sends 6-digit OTP
// @route   POST /api/v1/auth/send-otp
// @access  Public
export const sendLoginOtp = async (req, res) => {
  const { phone } = req.body;

  try {
    if (!phone) {
      return res.status(400).json({ message: 'Please provide registered Mobile Number' });
    }

    const cleanPhone = String(phone).trim();
    const admin = await SuperAdmin.findOne({ phone: cleanPhone });

    if (!admin) {
      return res.status(404).json({ message: 'No registered Super Admin found with this mobile number' });
    }

    // Account must exist and must be ACTIVE
    if ((admin.status || '').toUpperCase() !== 'ACTIVE') {
      return res.status(403).json({ message: 'Account is not active or has been disabled' });
    }

    // Generate 6-digit OTP and set 10 minute expiry
    const otp = generateSixDigitOtp();
    admin.loginOtp = otp;
    admin.loginOtpExpires = Date.now() + 10 * 60 * 1000;
    await admin.save();

    // Trigger SMS delivery (Real Brevo API if key exists, otherwise Dev Mock log)
    await sendSmsOtp(admin.phone, otp);

    const responsePayload = {
      message: 'OTP sent successfully to registered mobile number',
      phone: admin.phone,
    };

    if (process.env.NODE_ENV !== 'production') {
      responsePayload.otp = otp; // Dev preview for easy testing
    }

    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// VERIFY LOGIN OTP & EMAIL/PASSWORD LOGIN API (Hybrid)
// @desc    Supports both Phone OTP login AND Email/Password login seamlessly
// @route   POST /api/v1/auth/verify-otp or POST /api/v1/auth/login
// @access  Public
export const verifyLoginOtp = async (req, res) => {
  const { phone, otp, email, password } = req.body;

  try {
    let admin = null;

    // --- MODE 1: Email / Phone + Password Login ---
    if (password) {
      const identifier = email || phone;
      if (!identifier) {
        return res.status(400).json({ message: 'Please provide Email or Mobile Number along with Password' });
      }

      const cleanIdentifier = String(identifier).trim().toLowerCase();
      admin = await SuperAdmin.findOne({
        $or: [{ email: cleanIdentifier }, { phone: cleanIdentifier }],
      });

      if (!admin) {
        return res.status(401).json({ message: 'Invalid email/phone or password' });
      }

      if ((admin.status || '').toUpperCase() !== 'ACTIVE') {
        return res.status(403).json({ message: 'Account is not active or has been disabled' });
      }

      if (!admin.password) {
        return res.status(401).json({ message: 'Password is not set for this account' });
      }

      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email/phone or password' });
      }
    }
    // --- MODE 2: Phone + OTP Login ---
    else if (otp) {
      if (!phone) {
        return res.status(400).json({ message: 'Please provide Mobile Number and OTP' });
      }

      const cleanPhone = String(phone).trim();
      admin = await SuperAdmin.findOne({
        phone: cleanPhone,
        loginOtp: String(otp).trim(),
        loginOtpExpires: { $gt: Date.now() },
      });

      if (!admin) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      if ((admin.status || '').toUpperCase() !== 'ACTIVE') {
        return res.status(403).json({ message: 'Account is not active or has been disabled' });
      }

      // Clear OTP fields upon successful verification
      admin.loginOtp = null;
      admin.loginOtpExpires = null;
    }
    else {
      return res.status(400).json({ message: 'Please provide Password or OTP to log in' });
    }

    // Access token (8 hours) and refresh token (7 days) generation
    const accessToken = generateAccessToken(admin._id);
    const refreshToken = generateRefreshToken(admin._id);

    // Save refresh token & update admin record
    admin.refreshToken = refreshToken;
    await admin.save();

    // Audit Log Recording
    await createAuditLog({
      user: admin.adminId || 'SUPER',
      userName: admin.fullName || 'Super Admin',
      userRole: admin.role || 'SUPER_ADMIN',
      action: password ? 'User Login via Password' : 'User Login via Phone OTP',
      record: 'SUPER_ADMIN_PANEL',
      module: 'Authentication',
    });

    // Set Cookies (8 hours for Access Token, 7 days for Refresh Token)
    res.cookie('accessToken', accessToken, getCookieOptions(8 * 60 * 60 * 1000));
    res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.json({
      message: 'Login successful',
      user: {
        _id: admin._id,
        adminId: admin.adminId,
        fullName: admin.fullName,
        email: admin.email,
        phone: admin.phone,
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

// Export alias for direct Email/Password login controller calls
export const loginWithEmailPassword = verifyLoginOtp;


// RESEND LOGIN OTP API
// @desc    Generates and sends a new login OTP to registered phone
// @route   POST /api/v1/auth/resend-otp
// @access  Public
export const resendLoginOtp = async (req, res) => {
  const { phone } = req.body;

  try {
    if (!phone) {
      return res.status(400).json({ message: 'Please provide registered Mobile Number' });
    }

    const cleanPhone = String(phone).trim();
    const admin = await SuperAdmin.findOne({ phone: cleanPhone });

    if (!admin) {
      return res.status(404).json({ message: 'No registered Super Admin found with this mobile number' });
    }

    if ((admin.status || '').toUpperCase() !== 'ACTIVE') {
      return res.status(403).json({ message: 'Account is not active or has been disabled' });
    }

    const newOtp = generateSixDigitOtp();
    admin.loginOtp = newOtp;
    admin.loginOtpExpires = Date.now() + 10 * 60 * 1000;
    await admin.save();

    // Trigger SMS delivery (Real Brevo API if key exists, otherwise Dev Mock log)
    await sendSmsOtp(admin.phone, newOtp);

    const responsePayload = {
      message: 'New OTP sent to registered mobile number successfully',
      phone: admin.phone,
    };

    if (process.env.NODE_ENV !== 'production') {
      responsePayload.otp = newOtp; // Dev preview
    }

    res.json(responsePayload);
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

    res.cookie('accessToken', newAccessToken, getCookieOptions(8 * 60 * 60 * 1000));
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

    const cookieOptions = getCookieOptions(0);
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

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
