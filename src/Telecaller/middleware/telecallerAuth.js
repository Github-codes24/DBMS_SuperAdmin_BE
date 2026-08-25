/**
 * Telecaller CRM — Telecaller Auth Middleware
 * Verifies JWT and loads the logged-in Telecaller.
 */

import jwt from 'jsonwebtoken';
import Telecaller from '../models/Telecaller.js';

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

    // Find Telecaller
    const telecaller = await Telecaller.findById(decoded.id);

    if (!telecaller) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, telecaller not found',
      });
    }

    // Check status
    if (telecaller.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Telecaller account is inactive',
      });
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