/**
 * Telecaller CRM — Profile Controller
 * Handles the logged-in telecaller's own profile get/update.
 */

import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';
import TelecallerProfile from '../models/TelecallerProfile.js';
import { validateProfileUpdate } from '../validations/vendor.validation.js';

// ─── GET /api/telecaller/profile ──────────────────────────────────────────────

/**
 * @desc   Get the logged-in telecaller's profile
 * @route  GET /api/telecaller/profile
 * @access Private (Telecaller)
 */
export const getProfile = asyncHandler(async (req, res) => {
  const telecaller = req.telecaller;

  if (!telecaller) {
    return sendError(res, 'Telecaller not found', 404);
  }

  return sendSuccess(res, 'Profile fetched successfully', {
    _id: telecaller._id,
    name: telecaller.name,
    employeeId: telecaller.employeeId,
    email: telecaller.email,
    phone: telecaller.phone,
    role: telecaller.role,
    status: telecaller.status,
    profileImage: telecaller.profileImage,
    lastLogin: telecaller.lastLogin,
    createdAt: telecaller.createdAt,
    updatedAt: telecaller.updatedAt,
  });
});

// ─── PUT /api/telecaller/profile ──────────────────────────────────────────────

/**
 * @desc   Update the logged-in telecaller's profile
 * @route  PUT /api/telecaller/profile
 * @access Private (Telecaller)
 *
 * Body:
 * {
 *   name?,
 *   phone?,
 *   email?,
 *   profileImage?
 * }
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const {
    name,
    phone,
    email,
    profileImage,
  } = req.body;

  const telecaller = req.telecaller;

  if (!telecaller) {
    return sendError(res, 'Telecaller not found', 404);
  }

  // Validate phone and email
  const validation = validateProfileUpdate({
    phone,
    email,
  });

  if (!validation.valid) {
    return sendError(res, validation.message);
  }

  // Update name
  if (name !== undefined) {
    telecaller.name = name.trim();
  }

  // Update phone
  if (phone !== undefined) {
    telecaller.phone = phone.trim();
  }

  // Update email
  if (email !== undefined) {
    telecaller.email = email.trim().toLowerCase();
  }

  // Update profile image
  if (req.file) {
    telecaller.profileImage = `/uploads/vendors/${req.file.filename}`;
  } else if (profileImage !== undefined) {
    telecaller.profileImage = profileImage;
  }

  const updated = await telecaller.save();

  return sendSuccess(res, 'Profile updated successfully', {
    _id: updated._id,
    name: updated.name,
    employeeId: updated.employeeId,
    email: updated.email,
    phone: updated.phone,
    role: updated.role,
    status: updated.status,
    profileImage: updated.profileImage,
    lastLogin: updated.lastLogin,
    updatedAt: updated.updatedAt,
  });
});