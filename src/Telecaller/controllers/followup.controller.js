/**
 * Telecaller CRM — Followup Controller
 * Handles creation and listing of vendor followup records.
 * Uses MongoDB transactions for the "Save & Followup" flow.
 */
import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';
import VendorFollowup from '../models/VendorFollowup.js';
import TelecallerAuditLog from '../models/TelecallerAuditLog.js';
import Vendor from '../../VendorPanel/Authentication/authSchema.js';
import { validateFollowup } from '../validations/vendor.validation.js';

// ─── POST /api/telecaller/vendors/:id/followup ───────────────────────────────
/**
 * @desc   Create followup + update vendor (transactional)
 *         This is the "Save & Followup" button flow.
 * @route  POST /api/telecaller/vendors/:id/followup
 * @access Private (Telecaller)
 */
export const createFollowup = asyncHandler(async (req, res) => {
  const { id: vendorId } = req.params;
  const { remarks, nextFollowupDate, status = 'PENDING', followupType, vendorUpdates } = req.body;

  // Validate followup fields
  const validation = validateFollowup({ followupType, status });
  if (!validation.valid) {
    return sendError(res, validation.message);
  }

  // Start Mongo transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Optionally update vendor data within the same transaction
    if (vendorUpdates && Object.keys(vendorUpdates).length > 0) {
      const vendor = await Vendor.findById(vendorId).session(session);
      if (!vendor) {
        await session.abortTransaction();
        session.endSession();
        return sendError(res, 'Vendor not found', 404);
      }

      const allowedFields = [
        'fullName', 'storeName', 'phone', 'email',
        'whatsapp', 'alternateContact', 'website',
        'address', 'city', 'state', 'country',
      ];
      allowedFields.forEach((field) => {
        if (vendorUpdates[field] !== undefined) {
          vendor[field] = vendorUpdates[field];
        }
      });
      await vendor.save({ session });
    }

    // 2. Create the followup record
    const [followup] = await VendorFollowup.create(
      [
        {
          vendorId,
          telecallerId: req.vendor._id,
          followupType,
          status,
          remarks: remarks || '',
          nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate) : null,
        },
      ],
      { session }
    );

    // 3. Create audit log within transaction
    await TelecallerAuditLog.create(
      [
        {
          module: 'Followup',
          action: 'CREATE_FOLLOWUP',
          vendorId,
          performedBy: req.vendor._id,
          oldData: null,
          newData: { followupType, status, remarks, nextFollowupDate },
          ipAddress: req.ip || '',
        },
      ],
      { session }
    );

    // 4. Commit transaction
    await session.commitTransaction();
    session.endSession();

    return sendSuccess(res, 'Followup created successfully', followup, 201);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('[createFollowup Transaction Error]', error.message);
    return sendError(res, 'Failed to create followup. Transaction rolled back.', 500);
  }
});

// ─── GET /api/telecaller/vendors/:id/followups ───────────────────────────────

/**
 * @desc   List followups for a vendor (newest first)
 * @route  GET /api/telecaller/vendors/:id/followups
 * @access Private (Telecaller)
 */
export const getFollowups = asyncHandler(async (req, res) => {
  const { id: vendorId } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const total = await VendorFollowup.countDocuments({ vendorId });
  const followups = await VendorFollowup.find({ vendorId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('telecallerId', 'fullName email vendorId')
    .lean();

  return sendSuccess(res, 'Followups fetched successfully', {
    page,
    limit,
    totalRecords: total,
    totalPages: Math.ceil(total / limit),
    data: followups,
  });
});
