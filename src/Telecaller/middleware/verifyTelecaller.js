/**
 * Telecaller Auth — JWT Verification Middleware
 * Guards all protected telecaller routes.
 * Verifies the Bearer token, loads the telecaller from DB,
 * and enforces role = "TELECALLER" & active status in both schemas.
 */
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import Telecaller from '../models/Telecaller.js';
import SuperAdminTelecaller from '../../SuperadminPanel/TelecallerManagement/telecallerSchema.js';

const verifyTelecaller = asyncHandler(async (req, res, next) => {
  let token;

  // ── Extract token from Authorization header ─────────────────────────────────
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Access denied. No token provided.');
  }

  // ── Verify JWT signature and expiry ────────────────────────────────────────
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    res.status(401);
    throw new Error('Invalid or expired token.');
  }

  // ── Enforce role = TELECALLER at token level ────────────────────────────────
  if (decoded.role !== 'TELECALLER') {
    res.status(403);
    throw new Error('Access denied. Insufficient permissions.');
  }

  // ── Load telecaller from DB (excludes password via select:false) ────────────
  const telecaller = await Telecaller.findById(decoded.id);
  if (!telecaller) {
    res.status(401);
    throw new Error('Telecaller account not found. Token may be stale.');
  }

  // ── Ensure account is active in Telecaller auth schema ──────────────────────
  const authStatus = (telecaller.status || '').toUpperCase();
  if (authStatus === 'BLOCKED') {
    res.status(403);
    throw new Error('Your account has been blocked by Super Admin.');
  }
  if (authStatus !== 'ACTIVE') {
    res.status(403);
    throw new Error('Your account is not active. Please contact Super Admin.');
  }

  // ── Ensure account is active in SuperAdminTelecaller schema ──────────────────
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
      res.status(403);
      throw new Error('Your account has been blocked by Super Admin.');
    }
    if (superStatus !== 'ACTIVE') {
      res.status(403);
      throw new Error('Your account is not active in Super Admin directory. Please contact Super Admin.');
    }
  }

  // ── Attach to request ───────────────────────────────────────────────────────
  req.telecaller = telecaller;
  next();
});

export default verifyTelecaller;
