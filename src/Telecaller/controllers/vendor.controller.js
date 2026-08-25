/**
 * Telecaller CRM — Vendor Controller
 * Handles all vendor management endpoints.
 * Thin layer: delegates business logic to vendor.service.js
 */

import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

import {
  createVendor,
  listVendors,
  getVendorFullProfile,
  updateVendorPersonal,
  updateVendorContactPayment,
  updateVendorCategory,
} from '../services/vendor.service.js';

import VendorImage from '../models/VendorImage.js';

import {
  validatePersonalUpdate,
  validateContactPayment,
} from '../validations/vendor.validation.js';

// ─── CREATE VENDOR ────────────────────────────────────────────────────────────

/**
 * @desc   Create a new vendor
 * @route  POST /api/telecaller/vendors
 * @access Private (Telecaller)
 */
export const createNewVendor = asyncHandler(async (req, res) => {
  const vendor = await createVendor(
    req.body,
    req.telecaller._id,
    req.ip
  );

  return sendSuccess(
    res,
    'Vendor created successfully',
    vendor,
    201
  );
});

// ─── GET VENDORS ──────────────────────────────────────────────────────────────

export const getVendors = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    vendorCode,
    isPaid,
    state,
    city,
    sortBy,
    sortOrder,
  } = req.query;

  const result = await listVendors({
    page: Math.max(1, parseInt(page)),
    limit: Math.min(
      100,
      Math.max(1, parseInt(limit))
    ),
    search,
    vendorCode,
    isPaid,
    state,
    city,
    sortBy,
    sortOrder,
  });

  return sendSuccess(
    res,
    'Vendors fetched successfully',
    result
  );
});

// ─── GET VENDOR BY ID ─────────────────────────────────────────────────────────

export const getVendorById = asyncHandler(async (req, res) => {
  const vendor = await getVendorFullProfile(
    req.params.id
  );

  if (!vendor) {
    return sendError(
      res,
      'Vendor not found',
      404
    );
  }

  return sendSuccess(
    res,
    'Vendor profile fetched successfully',
    vendor
  );
});

// ─── UPDATE PERSONAL ──────────────────────────────────────────────────────────

export const updatePersonal = asyncHandler(async (req, res) => {
  const validation = validatePersonalUpdate(
    req.body
  );

  if (!validation.valid) {
    return sendError(
      res,
      validation.message
    );
  }

  const updated = await updateVendorPersonal(
    req.params.id,
    req.body,
    req.telecaller._id,
    req.ip
  );

  if (!updated) {
    return sendError(
      res,
      'Vendor not found',
      404
    );
  }

  return sendSuccess(
    res,
    'Vendor updated successfully',
    updated
  );
});

// ─── UPLOAD VENDOR IMAGES ─────────────────────────────────────────────────────

export const uploadImages = asyncHandler(async (req, res) => {
  const { id: vendorId } = req.params;

  if (!req.files || req.files.length === 0) {
    return sendError(
      res,
      'No images were uploaded.'
    );
  }

  const existingCount =
    await VendorImage.countDocuments({
      vendorId,
      isDeleted: false,
    });

  if (existingCount + req.files.length > 5) {
    return sendError(
      res,
      `Uploading these images would exceed the 5-image limit. Current: ${existingCount}`
    );
  }

  const savedImages = await Promise.all(
    req.files.map((file) =>
      VendorImage.create({
        vendorId,

        image: `/uploads/vendors/${file.filename}`,

        isPrimary: false,

        isDeleted: false,

        // IMPORTANT:
        // This is the logged-in Telecaller
        uploadedBy: req.telecaller._id,
      })
    )
  );

  return sendSuccess(
    res,
    `${savedImages.length} image(s) uploaded successfully`,
    savedImages,
    201
  );
});

// ─── SET PRIMARY IMAGE ────────────────────────────────────────────────────────

export const setPrimaryImage = asyncHandler(async (req, res) => {
  const {
    id: vendorId,
    imageId,
  } = req.params;

  const image = await VendorImage.findOne({
    _id: imageId,
    vendorId,
    isDeleted: false,
  });

  if (!image) {
    return sendError(
      res,
      'Image not found',
      404
    );
  }

  await VendorImage.updateMany(
    {
      vendorId,
      isPrimary: true,
    },
    {
      $set: {
        isPrimary: false,
      },
    }
  );

  image.isPrimary = true;

  await image.save();

  return sendSuccess(
    res,
    'Primary image updated successfully',
    image
  );
});

// ─── DELETE IMAGE ─────────────────────────────────────────────────────────────

export const deleteImage = asyncHandler(async (req, res) => {
  const {
    id: vendorId,
    imageId,
  } = req.params;

  const image = await VendorImage.findOne({
    _id: imageId,
    vendorId,
    isDeleted: false,
  });

  if (!image) {
    return sendError(
      res,
      'Image not found',
      404
    );
  }

  image.isDeleted = true;

  if (image.isPrimary) {
    image.isPrimary = false;
  }

  await image.save();

  return sendSuccess(
    res,
    'Vendor image deleted successfully'
  );
});

// ─── UPDATE CONTACT & PAYMENT ─────────────────────────────────────────────────

export const updateContactPayment = asyncHandler(
  async (req, res) => {
    const validation =
      validateContactPayment(req.body);

    if (!validation.valid) {
      return sendError(
        res,
        validation.message
      );
    }

    const updated =
      await updateVendorContactPayment(
        req.params.id,
        req.body,
        req.telecaller._id,
        req.ip
      );

    if (!updated) {
      return sendError(
        res,
        'Vendor not found',
        404
      );
    }

    return sendSuccess(
      res,
      'Contact & payment info updated successfully',
      updated
    );
  }
);

// ─── UPDATE CATEGORY ──────────────────────────────────────────────────────────

export const updateCategory = asyncHandler(
  async (req, res) => {
    const updated =
      await updateVendorCategory(
        req.params.id,
        req.body,
        req.telecaller._id,
        req.ip
      );

    if (!updated) {
      return sendError(
        res,
        'Vendor not found',
        404
      );
    }

    return sendSuccess(
      res,
      'Category updated successfully',
      updated
    );
  }
);