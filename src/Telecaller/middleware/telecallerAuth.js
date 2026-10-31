/**
 * Telecaller CRM — Telecaller Auth Middleware
 * Verifies JWT, loads the logged-in Telecaller, and enforces active status in both schemas.
 */

import jwt from 'jsonwebtoken';
import Telecaller from '../models/Telecaller.js';
import SuperAdminTelecaller from '../../SuperadminPanel/TelecallerManagement/telecallerSchema.js';

export const protectTelecaller = async (req, res, next) => {
  let token;

  try {
    // Check Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided',
      });
    }

    // Verify JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Find Telecaller in Telecaller auth collection
    const telecaller = await Telecaller.findById(decoded.id);

    if (!telecaller) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, telecaller not found',
      });
    }

    // Check status in Telecaller auth schema
    const authStatus = (telecaller.status || '').toUpperCase();
    if (authStatus === 'BLOCKED') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked by Super Admin.',
      });
    }
    if (authStatus !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Telecaller account is inactive or pending approval.',
      });
    }

    // Check status in SuperAdminTelecaller schema
    const superAdminTc = await SuperAdminTelecaller.findOne({
      $or: [
        { email: telecaller.email.toLowerCase() },
        { mobileNumber: telecaller.phone },
        { userId: telecaller.employeeId },
      ],
      isDeleted: false,
    });

    if (superAdminTc) {
      const superStatus = (superAdminTc.status || '').toUpperCase();
      if (superStatus === 'BLOCKED') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been blocked by Super Admin.',
        });
      }
      if (superStatus !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          message: 'Telecaller account is not active in Super Admin directory.',
        });
      }
    }

    // Attach logged-in Telecaller to request
    req.telecaller = telecaller;

    next();

  } catch (error) {
    console.error('[TelecallerAuth]', error.message);

    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed',
    });
  }
};

export default protectTelecaller;
