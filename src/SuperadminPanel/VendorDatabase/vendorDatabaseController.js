import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import SuperAdminVendor, { VendorFormField} from './vendorDatabaseSchema.js';
import Vendor from '../../VendorPanel/Authentication/authSchema.js';
import {
  parseExcelOrCsvBuffer,
  filterUniqueRecords,
  generateCSVData,
  generateHTMLPDFReport,
} from '../../utils/excelCsvHandler.js';
import { createAuditLog } from '../../utils/auditLogger.js';
import {
  validateAndPrepareCustomFields,
} from '../../utils/vendorCustomFieldService.js';
import { sendVendorCredentialsEmail } from '../../utils/emailHandler.js';

// Helper to generate a random 8-character password if not provided
const generateRandomPassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
  let pass = '';
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

// Helper to generate auto-increment Vendor ID (VEN001, VEN002...) and Trans No (TRX90101, TRX90102...)
const generateVendorIdAndTransNo = async () => {
  const existingVendors = await SuperAdminVendor.find({}).select('vendorId transNo');

  let maxVenNum = 0;
  let maxTrxNum = 100; // Base index so TRX90101 is 101

  existingVendors.forEach((v) => {
    if (v.vendorId) {
      const num = parseInt(v.vendorId.replace(/^VEN/i, ''), 10);
      if (!isNaN(num) && num > maxVenNum) {
        maxVenNum = num;
      }
    }
    if (v.transNo) {
      const num = parseInt(v.transNo.replace(/^TRX90/i, ''), 10);
      if (!isNaN(num) && num > maxTrxNum) {
        maxTrxNum = num;
      }
    }
  });

  const nextVenNum = maxVenNum + 1;
  const nextTrxNum = maxTrxNum + 1;

  return {
    vendorId: `VEN${nextVenNum.toString().padStart(3, '0')}`,
    transNo: `TRX90${nextTrxNum.toString().padStart(3, '0')}`,
  };
};

// Helper to safely find Vendor by MongoDB _id, custom vendorId (VEN002), or transNo (TRX90102) without CastError
const findVendorByIdOrCustomId = async (identifier) => {
  if (!identifier) return null;
  const str = identifier.toString().trim();
  const isObjId = mongoose.Types.ObjectId.isValid(str);

  const query = isObjId
    ? { $or: [{ _id: str }, { vendorId: str }, { transNo: str }], isDeleted: false }
    : { $or: [{ vendorId: str }, { transNo: str }], isDeleted: false };

  return await SuperAdminVendor.findOne(query);
};

// Normalize status string for consistent formatting (Default: Pending)
const normalizeStatus = (statusStr) => {
  if (!statusStr) return 'Pending';
  const str = statusStr.toString().trim().toLowerCase();
  if (str === 'active') return 'Active';
  return 'Pending';
};
// 1. GET ALL VENDORS DIRECTORY
// @desc    Get All Vendors Directory (Search, Filter, Pagination)
// @route   GET /api/v1/superadmin/vendors
// @access  Private (SuperAdmin)
export const getVendors = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const { search, status, state, city, category } = req.query;

    const query = { isDeleted: false };

    // Search filter across vendorName, transNo, vendorId, category, verification date, city, state
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { vendorName: searchRegex },
        { transNo: searchRegex },
        { vendorId: searchRegex },
        { category: searchRegex },
        { state: searchRegex },
        { city: searchRegex },
        { contactNo: searchRegex },
        { srNo: searchRegex },
      ];
    }

    if (status && status.trim()) {
      query.status = normalizeStatus(status);
    }

    if (category && category.trim()) {
      query.category = new RegExp(category.trim(), 'i');
    }

    if (state && state.trim()) {
      query.state = new RegExp(state.trim(), 'i');
    }

    if (city && city.trim()) {
      query.city = new RegExp(city.trim(), 'i');
    }

    const totalVendors = await SuperAdminVendor.countDocuments(query);

    const vendors = await SuperAdminVendor.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    res.json({
      totalVendors,
      totalPages: Math.ceil(totalVendors / limit),
      currentPage: page,
      limit,
      vendors,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// 2. CREATE SINGLE VENDOR RECORD
// @desc    Create Single Vendor Record (Manual "+ Add Vendor")
// @route   POST /api/v1/superadmin/vendors
// @access  Private (SuperAdmin)
export const createVendor = async (req, res) => {
  const {
    srNo,
    transNo,
    vendorName,
    ownerName,
    category,
    verificationDateTime,
    contactNo,
    email,
    state,
    city,
    pincode,
    completeAddress,
    gstin,
    customFields = [],

  } = req.body;
  try {
    const DEFAULT_VENDOR_LIMIT = 100;
    const vendorCount = await SuperAdminVendor.countDocuments({
      isDeleted: false,
    });
    const validatedCustomFields =
    await validateAndPrepareCustomFields(customFields);

    if (vendorCount >= DEFAULT_VENDOR_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `Vendor limit reached. Maximum ${DEFAULT_VENDOR_LIMIT} vendors are allowed.`,
      });
    }
    if (!vendorName || !vendorName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vendor Name is required',
      });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category is required',
      });
    }
    // Check explicitly provided transaction number
    if (transNo && transNo.trim()) {
      const existingTrans = await SuperAdminVendor.findOne({
        transNo: transNo.trim(),
      });
      if (existingTrans) {
        return res.status(400).json({
          success: false,
          message: `Transaction Number '${transNo.trim()}' is already in use.`,
        });
      }
    }
    // check for duplicate  vendorName 
    const normalizedVendorName = vendorName.trim();
    const existingVendor = await SuperAdminVendor.findOne({
      vendorName: {
        $regex: `^${normalizedVendorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        $options: 'i',
      },
      isDeleted: false,
    });
    
    if (existingVendor) {
      return res.status(409).json({
        success: false,
        message: `Vendor name '${normalizedVendorName}' already exists.`,
      });
    }
     // check if the email is unique or not 
     const cleanEmail = email?.trim().toLowerCase() || "";
     if (cleanEmail) {
       const existingVendor = await SuperAdminVendor.findOne({
         email: cleanEmail,
       });
       if (existingVendor) {
         return res.status(409).json({
           success: false,
           message: "This email is already registered.",
         });
       }
     }
    const {
      vendorId: autoVendorId,
      transNo: autoTransNo,
    } = await generateVendorIdAndTransNo();
    const finalTransNo =
      transNo && transNo.trim()
        ? transNo.trim()
        : autoTransNo;
    // Auto Sr No
    let calculatedSrNo = srNo;
    if (!calculatedSrNo) {
      const count = await SuperAdminVendor.countDocuments({
        isDeleted: false,
      });

      calculatedSrNo = (count + 1)
        .toString()
        .padStart(2, '0');
    }
    /*
     * IMPORTANT:
     * Do NOT generate a password here.
     *
     * Password will be generated only when
     * Super Admin activates the vendor.
     */

    // 1. Create vendor master record

    const vendor = await SuperAdminVendor.create({
      vendorId: autoVendorId,
      transNo: finalTransNo,
      srNo: calculatedSrNo,

      vendorName: vendorName.trim(),
      ownerName: ownerName ? ownerName.trim() : '',
      category: category.trim(),

      verificationDateTime: verificationDateTime
        ? new Date(verificationDateTime)
        : new Date(),

      contactNo: contactNo ? contactNo.trim() : '',
      email: cleanEmail,

      state: state ? state.trim() : '',
      city: city ? city.trim() : '',
      pincode: pincode ? pincode.trim() : '',
      completeAddress: completeAddress
        ? completeAddress.trim()
        : '',
      gstin: gstin ? gstin.trim() : '',

      // ALWAYS Pending on creation
      status: 'Pending',
      customFields: validatedCustomFields,

      createdBy: req.superAdmin._id,
    });

    // 2. Create Vendor authentication record
    const vendorAuthEmail =
      cleanEmail ||
      `${autoVendorId.toLowerCase()}@lts-dbms.com`;

    await Vendor.findOneAndUpdate(
      { vendorId: autoVendorId },
      {
        vendorId: autoVendorId,
        email: vendorAuthEmail,

        fullName:
          ownerName && ownerName.trim()
            ? ownerName.trim()
            : vendorName.trim(),

        phone: contactNo ? contactNo.trim() : '',

        // No password until activation
        password: null,

        storeName: vendorName.trim(),

        // Vendor cannot login yet
        storeStatus: 'Pending Verification',

        state: state ? state.trim() : '',
        city: city ? city.trim() : '',
        address: completeAddress
          ? completeAddress.trim()
          : '',
      },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
      }
    );
    // 3. Audit log
    await createAuditLog({
      user: req.superAdmin?.adminId || 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      action: 'Created Vendor',
      record: vendor.transNo || vendor.vendorId,
      module: 'Vendor Database',
    });

    // 4. Response
    return res.status(201).json({
      success: true,
      message: 'Vendor created successfully and is pending approval.',
      data: {
        vendorId: vendor.vendorId,
        email: vendor.email || '',
        status: vendor.status,
        vendor,
      },
    });

  } catch (error) {
    console.error('Create vendor error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
// Active the Account and Send Id and Password 
export const activateVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Find vendor
    const vendor = await SuperAdminVendor.findOne({
      vendorId,
      isDeleted: false,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Prevent activating an already active vendor
    if (vendor.status === 'Active') {
      return res.status(400).json({
        success: false,
        message: 'Vendor is already active',
      });
    }

    // Make sure vendor has an email
    if (!vendor.email) {
      return res.status(400).json({
        success: false,
        message:
          'Vendor cannot be activated because no email address is available.',
      });
    }
    /*
     * Generate password ONLY during activation.
     */
    const rawPassword = generateRandomPassword();

    const hashedPassword = await bcrypt.hash(
      rawPassword,
      10
    );

    // Update master vendor
    vendor.status = 'Active';
    vendor.password = hashedPassword;

    await vendor.save();

    // Update authentication record
    const vendorAuth = await Vendor.findOneAndUpdate(
      { vendorId },

      {
        email: vendor.email,
        password: hashedPassword,
        storeStatus: 'Active & Verified',
      },

      {
        returnDocument: 'after',
      }
    );

    if (!vendorAuth) {
      // Important: don't silently continue
      return res.status(500).json({
        success: false,
        message: 'Vendor authentication record not found.',
      });
    }

    /*
     * Send credentials AFTER successful activation.
     */
    const emailResult =
      await sendVendorCredentialsEmail({
        toEmail: vendor.email,
        vendorName: vendor.vendorName,
        vendorId: vendor.vendorId,
        password: rawPassword,
      });

    // Audit
    await createAuditLog({
      user: req.superAdmin?.adminId || 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      action: 'Activated Vendor',
      record: vendor.transNo || vendor.vendorId,
      module: 'Vendor Database',
    });

    return res.status(200).json({
      success: true,
      message: emailResult.success
        ? 'Vendor activated and credentials sent successfully.'
        : 'Vendor activated, but credentials email could not be sent.',

      data: {
        vendorId: vendor.vendorId,
        email: vendor.email,
        status: vendor.status,
        emailSent: emailResult.success,
        ...(emailResult.error && {
          emailError: emailResult.error,
        }),
      },
    });

  } catch (error) {
    console.error('Activate vendor error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
// Change Password of the Vendor
export const changeVendorPassword = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { newPassword } = req.body;

    // 1. Validate password
    if (!newPassword || !newPassword.trim()) {
      return res.status(400).json({
        success: false,
        message: 'New password is required',
      });
    }

    if (newPassword.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // 2. Find vendor
    const vendor = await SuperAdminVendor.findOne({
      vendorId,
      isDeleted: false,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // 3. Make sure vendor is active
    if (
      vendor.status !== 'Active' &&
      vendor.status !== 'ACTIVE'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Password can only be changed for an active vendor',
      });
    }

    // 4. Make sure vendor has registered email
    if (!vendor.email) {
      return res.status(400).json({
        success: false,
        message:
          'Vendor cannot receive password because no registered email address is available.',
      });
    }

    // 5. Hash new password
    const hashedPassword = await bcrypt.hash(
      newPassword.trim(),
      10
    );

    // 6. Update SuperAdminVendor password
    vendor.password = hashedPassword;
    vendor.updatedBy = req.superAdmin?._id || null;

    await vendor.save();

    // 7. Update Vendor authentication record
    const vendorAuth = await Vendor.findOneAndUpdate(
      { vendorId },

      {
        password: hashedPassword,
      },

      {
        returnDocument: 'after',
      }
    );

    if (!vendorAuth) {
      return res.status(500).json({
        success: false,
        message: 'Vendor authentication record not found.',
      });
    }

    // 8. Send new credentials to registered email
    const emailResult =
      await sendVendorCredentialsEmail({
        toEmail: vendor.email,
        vendorName: vendor.vendorName,
        vendorId: vendor.vendorId,
        password: newPassword.trim(),
      });

    // 9. Audit log
    await createAuditLog({
      user: req.superAdmin?.adminId || 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      action: 'Changed Vendor Password',
      record: vendor.transNo || vendor.vendorId,
      module: 'Vendor Database',
    });

    // 10. Response
    return res.status(200).json({
      success: true,
      message: emailResult.success
        ? 'Vendor password changed and credentials sent successfully.'
        : 'Vendor password changed, but credentials email could not be sent.',

      data: {
        vendorId: vendor.vendorId,
        email: vendor.email,
        emailSent: emailResult.success,
        ...(emailResult.error && {
          emailError: emailResult.error,
        }),
      },
    });

  } catch (error) {
    console.error(
      'Change vendor password error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
//Delete Vendor's
export const deleteVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // 1. Find vendor
    const vendor = await SuperAdminVendor.findOne({
      vendorId,
      isDeleted: false,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // 2. Soft delete vendor
    vendor.isDeleted = true;
    vendor.updatedBy = req.superAdmin?._id || null;

    await vendor.save();

    // 3. Disable vendor authentication
    const vendorAuth = await Vendor.findOneAndUpdate(
      { vendorId },

      {
        storeStatus: 'Deleted',
      },

      {
        returnDocument: 'after',
      }
    );

    // 4. Audit log
    await createAuditLog({
      user: req.superAdmin?.adminId || 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      action: 'Deleted Vendor',
      record: vendor.transNo || vendor.vendorId,
      module: 'Vendor Database',
    });

    return res.status(200).json({
      success: true,
      message: 'Vendor deleted successfully.',
      data: {
        vendorId: vendor.vendorId,
        deleted: true,
      },
    });

  } catch (error) {
    console.error(
      'Delete vendor error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
// Search Filter for the vendor's
export const searchVendors = async (req, res) => {
  try {
    const {
      name,
      state,
      city,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page must be a positive integer.',
      });
    }

    if (
      !Number.isInteger(limitNumber) ||
      limitNumber < 1 ||
      limitNumber > 100
    ) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 100.',
      });
    }

    const skip = (pageNumber - 1) * limitNumber;

    const filter = {
      isDeleted: false,
    };

    // Vendor name search
    if (typeof name === 'string' && name.trim()) {
      filter.vendorName = {
        $regex: name.trim(),
        $options: 'i',
      };
    }

    // State filter
    if (typeof state === 'string' && state.trim()) {
      filter.state = state.trim();
    }

    // City filter
    if (typeof city === 'string' && city.trim()) {
      filter.city = city.trim();
    }

    const [vendors, total] = await Promise.all([
      SuperAdminVendor.find(filter)
        .select(
          'vendorId vendorName contactNo verificationDateTime state city status createdBy'
        )
        .populate({
          path: 'createdBy',
          select: 'adminId referCode fullName',
        })
        .sort({ verificationDateTime: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      SuperAdminVendor.countDocuments(filter),
    ]);

    const data = vendors.map((vendor) => {
      const agent = vendor.createdBy;

      delete vendor.createdBy;

      return {
        ...vendor,
        referId: agent?.adminId || null,
        referCode: agent?.referCode || null,
        agentName: agent?.fullName || null,
      };
    });

    const totalPages = Math.ceil(total / limitNumber);

    return res.status(200).json({
      success: true,
      message: 'Vendors searched successfully.',
      data,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
      },
    });
  } catch (error) {
    console.error('Search vendors error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to search vendors.',
    });
  }
};
// Create Custom field in the Vendor
export const createVendorFormField = async (req, res) => {
  try {
    const {
      label,
      type,
      required = false,
      placeholder = '',
      options = [],
    } = req.body;

    if (!label || !label.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Field label is required.',
      });
    }

    const allowedTypes = [
      'TEXT',
      'NUMBER',
      'EMAIL',
      'DATE',
      'DROPDOWN',
      'CHECKBOX',
      'TOGGLE',
      'TEXTAREA',
    ];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid field type.',
      });
    }

    if (type === 'DROPDOWN') {
      if (!Array.isArray(options) || options.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Options are required for dropdown fields.',
        });
      }
    }

    const field = await VendorFormField.create({
      label: label.trim(),
      type,
      required: Boolean(required),
      placeholder: placeholder?.trim() || '',
      options: type === 'DROPDOWN' ? options : [],
      createdBy: req.superAdmin._id,
      updatedBy: req.superAdmin._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Vendor form field created successfully.',
      data: field,
    });
  } catch (error) {
    console.error('Create vendor form field error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};
// GET Custom Field Data 
export const getVendorFormFields = async (req, res) => {
  try {
    const fields = await VendorFormField.find({
      isActive: true,
    })
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Vendor form fields fetched successfully.',
      data: fields,
    });
  } catch (error) {
    console.log("hi error");
    console.error('Get vendor form fields error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};

export const updateVendorFormField = async (req, res) => {
  try {
    const { fieldId } = req.params;

    const {
      label,
      type,
      required,
      placeholder,
      options,
    } = req.body;

    const field = await VendorFormField.findOne({
      _id: fieldId,
      isActive: true,
    });

    if (!field) {
      return res.status(404).json({
        success: false,
        message: 'Vendor form field not found.',
      });
    }

    if (label !== undefined) {
      if (!label.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Field label cannot be empty.',
        });
      }

      field.label = label.trim();
    }

    if (type !== undefined) {
      const allowedTypes = [
        'TEXT',
        'NUMBER',
        'EMAIL',
        'DATE',
        'DROPDOWN',
        'CHECKBOX',
        'TOGGLE',
        'TEXTAREA',
      ];

      if (!allowedTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid field type.',
        });
      }

      field.type = type;
    }

    if (required !== undefined) {
      field.required = Boolean(required);
    }

    if (placeholder !== undefined) {
      field.placeholder = placeholder.trim();
    }

    if (options !== undefined) {
      if (field.type === 'DROPDOWN') {
        if (!Array.isArray(options) || options.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Options are required for dropdown fields.',
          });
        }

        field.options = options;
      } else {
        field.options = [];
      }
    }

    field.updatedBy = req.superAdmin._id;

    await field.save();

    return res.status(200).json({
      success: true,
      message: 'Vendor form field updated successfully.',
      data: field,
    });
  } catch (error) {
    console.error('Update vendor form field error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};

export const deleteVendorFormField = async (req, res) => {
  try {
    const { fieldId } = req.params;

    const field = await VendorFormField.findOneAndUpdate(
      {
        _id: fieldId,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
          updatedBy: req.superAdmin._id,
        },
      },
      {
        new: true,
      }
    );

    if (!field) {
      return res.status(404).json({
        success: false,
        message: 'Vendor form field not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Vendor form field removed successfully.',
    });
  } catch (error) {
    console.error('Delete vendor form field error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};

// 3. GET SINGLE VENDOR BY ID OR CUSTOM ID
// @desc    Get Single Vendor Record by Mongo _id, custom vendorId (VEN002), or transNo (TRX90102)
// @route   GET /api/v1/superadmin/vendors/:id
// @access  Private (SuperAdmin)
export const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await findVendorByIdOrCustomId(id);

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor record not found' });
    }

    res.json(vendor);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// 4. UPDATE VENDOR RECORD (STATUS RULES ENFORCED)
// @desc    Update Vendor Record & Status Rules
// @route   PATCH /api/v1/superadmin/vendors/:id
// @access  Private (SuperAdmin)
export const updateVendor = async (req, res) => {
  const { id } = req.params;

  try {
    const vendor = await findVendorByIdOrCustomId(id);

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor record not found' });
    }
    const {
      srNo,
      transNo,
      vendorName,
      category,
      verificationDateTime,
      contactNo,
      state,
      city,
      status,
    } = req.body;

    // BUSINESS RULE: Status Transition Protection
    // Pending -> Active is ALLOWED. Active -> Pending is STRICTLY PROHIBITED.
    if (status !== undefined) {
      const currentNormalized = normalizeStatus(vendor.status);
      const incomingNormalized = normalizeStatus(status);

      if (currentNormalized === 'Active' && incomingNormalized === 'Pending') {
        return res.status(400).json({
          message: 'Status Transition Error: Cannot change status from Active back to Pending',
        });
      }
      vendor.status = incomingNormalized;
    }

    if (vendorName) vendor.vendorName = vendorName.trim();
    if (transNo) vendor.transNo = transNo.trim();
    if (category) vendor.category = category.trim();
    if (verificationDateTime) vendor.verificationDateTime = new Date(verificationDateTime);
    if (contactNo !== undefined) vendor.contactNo = contactNo.trim();
    if (state !== undefined) vendor.state = state.trim();
    if (city !== undefined) vendor.city = city.trim();
    if (srNo !== undefined) vendor.srNo = srNo;

    vendor.updatedBy = req.superAdmin._id;
    await vendor.save();

    // Automatic Audit Log Recording
    await createAuditLog({
      user: req.superAdmin?.adminId || 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      action: 'Updated Vendor',
      record: vendor.transNo || vendor.vendorId,
      module: 'Vendor Database',
    });

    res.json({
      message: 'Vendor record updated successfully',
      vendor,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// BULK IMPORT VENDORS (DIRECT FILE UPLOAD OR JSON PAYLOAD)
// @desc    Bulk Import Vendors from Excel / CSV Data (.xlsx, .csv, 50MB Limit & Duplicate Check)
// @route   POST /api/v1/superadmin/vendors/import
// @access  Private (SuperAdmin)
export const importVendors = async (req, res) => {
  try {
    let vendorsPayload = req.body?.vendors || req.body?.data;

    // Direct Binary Excel / CSV file upload via multer (req.file or req.files)
    const uploadedFile = req.file || (Array.isArray(req.files) && req.files.length > 0 ? req.files[0] : null);
    if (uploadedFile && uploadedFile.buffer) {
      vendorsPayload = parseExcelOrCsvBuffer(uploadedFile.buffer);
    }

    if (!Array.isArray(vendorsPayload) || vendorsPayload.length === 0) {
      return res.status(400).json({ message: 'Please attach a valid Excel/CSV file (.xlsx, .xls, .csv) or provide a non-empty array of vendor records' });
    }

    // Helper to extract clean digits from phone string for exact matching
    const cleanPhoneDigits = (phoneStr) => (phoneStr ? phoneStr.toString().replace(/[\s\-\(\)\.\+]/g, '') : '');

    // Fetch all existing vendor records (including soft-deleted) to build lookup sets
    const existingRecords = await SuperAdminVendor.find({}).select('vendorId transNo vendorName contactNo');

    const existingTransNoSet = new Set(existingRecords.map((r) => (r.transNo || '').toLowerCase().trim()).filter(Boolean));
    const existingVendorIdsSet = new Set(existingRecords.map((r) => (r.vendorId || '').toLowerCase().trim()).filter(Boolean));
    const existingNamesSet = new Set(existingRecords.map((r) => (r.vendorName || '').toLowerCase().trim()).filter(Boolean));
    const existingPhoneSet = new Set(existingRecords.map((r) => cleanPhoneDigits(r.contactNo)).filter(Boolean));
    const existingNamePhoneSet = new Set(
      existingRecords.map((r) => `${(r.vendorName || '').toLowerCase().trim()}_${cleanPhoneDigits(r.contactNo)}`)
    );

    // Filter incoming payload based on Vendor Name & Phone Number uniqueness + index collision protection
    const uniqueRecords = [];
    let skippedDuplicatesCount = 0;
    const batchTransNoSet = new Set();
    const batchNamesSet = new Set();
    const batchPhoneSet = new Set();
    const batchNamePhoneSet = new Set();

    for (const item of vendorsPayload) {
      if (!item) {
        skippedDuplicatesCount++;
        continue;
      }

      const name = (item.vendorName || item.VendorName || item['Vendor Name'] || item.Name || '').toString().trim();
      const phone = (item.contactNo || item.ContactNo || item['Contact No'] || item['Contact No.'] || item.Phone || item['Phone Number'] || '').toString().trim();
      const trans = (item.transNo || item.TransNo || item['Trans No'] || item['TRANS NO.'] || '').toString().trim();
      const venId = (item.vendorId || item.VendorId || item['Vendor ID'] || '').toString().trim();

      if (!name) {
        skippedDuplicatesCount++;
        continue;
      }

      const nameLower = name.toLowerCase();
      const phoneDigits = cleanPhoneDigits(phone);
      const namePhoneKey = `${nameLower}_${phoneDigits}`;
      const transLower = trans.toLowerCase();
      const venIdLower = venId.toLowerCase();

      // 100% Future-Proof Uniqueness Rule:
      // Skip if exact SAME Vendor Name AND SAME Phone Number pair exists in DB or current Excel batch
      const isDuplicateNamePhone = phoneDigits
        ? existingNamePhoneSet.has(namePhoneKey) || batchNamePhoneSet.has(namePhoneKey)
        : existingNamesSet.has(nameLower) || batchNamesSet.has(nameLower);

      // Index Collision Protection: Skip if explicit transNo or vendorId collides with DB
      const isDuplicateTrans = transLower && (existingTransNoSet.has(transLower) || batchTransNoSet.has(transLower));
      const isDuplicateVenId = venIdLower && existingVendorIdsSet.has(venIdLower);

      if (isDuplicateNamePhone || isDuplicateTrans || isDuplicateVenId) {
        skippedDuplicatesCount++;
        continue;
      }

      // Record in batch sets
      if (nameLower) batchNamesSet.add(nameLower);
      if (phoneDigits) batchPhoneSet.add(phoneDigits);
      batchNamePhoneSet.add(namePhoneKey);
      if (transLower) batchTransNoSet.add(transLower);

      uniqueRecords.push(item);
    }

    if (uniqueRecords.length === 0) {
      return res.status(200).json({
        message: `All ${vendorsPayload.length} records in the uploaded file already exist in the database. 0 new records were imported.`,
        importedCount: 0,
        skippedDuplicatesCount: vendorsPayload.length,
      });
    }

    // Determine starting numeric part for auto custom VENxxx and TRX901xx ID generation
    let maxVenNum = 0;
    let maxTrxNum = 100;

    existingRecords.forEach((v) => {
      if (v.vendorId) {
        const num = parseInt(v.vendorId.replace(/^VEN/i, ''), 10);
        if (!isNaN(num) && num > maxVenNum) maxVenNum = num;
      }
      if (v.transNo) {
        const num = parseInt(v.transNo.replace(/^TRX90/i, ''), 10);
        if (!isNaN(num) && num > maxTrxNum) maxTrxNum = num;
      }
    });

    let currentVenNum = maxVenNum + 1;
    let currentTrxNum = maxTrxNum + 1;

    const totalExisting = await SuperAdminVendor.countDocuments({ isDeleted: false });

    const newVendorEntries = uniqueRecords.map((v, index) => {
      // Auto-generate VENxxx ensuring no collision
      let vendorId = (v.vendorId || v.VendorId || v['Vendor ID'] || '').toString().trim();
      if (!vendorId) {
        while (existingVendorIdsSet.has(`ven${currentVenNum.toString().padStart(3, '0')}`)) {
          currentVenNum++;
        }
        vendorId = `VEN${currentVenNum.toString().padStart(3, '0')}`;
        currentVenNum++;
      }
      existingVendorIdsSet.add(vendorId.toLowerCase());

      // Auto-generate TRX901xx ensuring no collision
      let transNo = (v.transNo || v.TransNo || v['Trans No'] || v['TRANS NO.'] || '').toString().trim();
      if (!transNo) {
        while (existingTransNoSet.has(`trx90${currentTrxNum.toString().padStart(3, '0')}`)) {
          currentTrxNum++;
        }
        transNo = `TRX90${currentTrxNum.toString().padStart(3, '0')}`;
        currentTrxNum++;
      }
      existingTransNoSet.add(transNo.toLowerCase());

      const srNo = v.srNo || v['Sr No'] || v['SR. NO.'] || (totalExisting + index + 1).toString().padStart(2, '0');
      const vendorName = (v.vendorName || v.VendorName || v['Vendor Name'] || v.Name || 'Unnamed Vendor').toString().trim();
      const category = (v.category || v.Category || 'General').toString().trim();
      const rawVerificationDate = v.verificationDateTime || v.VerificationDate || v['Verification Date'] || v['Verification Date & Time'] || v['Contact Verification'];
      const verificationDateTime = rawVerificationDate ? new Date(rawVerificationDate) : new Date();
      const contactNo = (v.contactNo || v.ContactNo || v['Contact No'] || v['Contact No.'] || '').toString().trim();
      const state = (v.state || v.State || '').toString().trim();
      const city = (v.city || v.City || '').toString().trim();
      const status = normalizeStatus(v.status || v.Status);

      return {
        vendorId,
        transNo,
        srNo,
        vendorName,
        category,
        verificationDateTime,
        contactNo,
        state,
        city,
        status,
        createdBy: req.superAdmin._id,
      };
    });

    const insertedVendors = await SuperAdminVendor.insertMany(newVendorEntries);

    res.status(201).json({
      message: `Import completed successfully: ${insertedVendors.length} unique vendor records imported. ${skippedDuplicatesCount} duplicate/invalid records were discarded.`,
      importedCount: insertedVendors.length,
      skippedDuplicatesCount,
      vendors: insertedVendors,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during import', error: error.message });
  }
};

// EXPORT VENDORS TO CSV (.csv)
// @desc    Export Vendors to CSV Format (.csv)
// @route   GET /api/v1/superadmin/vendors/export/csv
// @access  Private (SuperAdmin)
export const exportVendorsCSV = async (req, res) => {
  try {
    const vendors = await SuperAdminVendor.find({ isDeleted: false }).sort({ createdAt: 1 });

    const headers = ['Sr No', 'Trans No', 'ID', 'Vendor Name', 'Category', 'Verification Date & Time', 'Contact No', 'State', 'City', 'Status'];

    const rowsData = vendors.map((v) => {
      const verifDate = v.verificationDateTime ? new Date(v.verificationDateTime).toLocaleString() : '';
      return [
        v.srNo || '',
        v.transNo || '',
        v.vendorId || '',
        v.vendorName || '',
        v.category || '',
        verifDate,
        v.contactNo || '',
        v.state || '',
        v.city || '',
        v.status || 'Active',
      ];
    });

    // Use reusable generateCSVData utility from src/utils/excelCsvHandler.js
    const csvContent = generateCSVData(headers, rowsData);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Vendor_Database.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Server error during CSV export', error: error.message });
  }
};
// EXPORT VENDORS TO PDF REPORT
// @desc    Export Vendors to PDF Format (Report view)
// @route   GET /api/v1/superadmin/vendors/export/pdf
// @access  Private (SuperAdmin)
export const exportVendorsPDF = async (req, res) => {
  try {
    const vendors = await SuperAdminVendor.find({ isDeleted: false }).sort({ createdAt: 1 });

    const headers = ['SR. NO.', 'TRANS NO.', 'VENDOR NAME', 'CATEGORY', 'VERIFICATION DATE & TIME', 'STATE', 'CITY', 'STATUS'];

    const tableRowsHtml = vendors
      .map((v, i) => {
        const verifDate = v.verificationDateTime ? new Date(v.verificationDateTime).toLocaleString() : '';
        const statusColor = v.status === 'Pending' ? '#d97706' : '#16a34a';
        return `
        <tr>
          <td>${(i + 1).toString().padStart(2, '0')}</td>
          <td><strong style="color: #ea580c;">${v.transNo}</strong></td>
          <td><strong>${v.vendorName}</strong></td>
          <td>${v.category}</td>
          <td>${verifDate}</td>
          <td>${v.state}</td>
          <td>${v.city}</td>
          <td style="color: ${statusColor}; font-weight: bold;">${v.status}</td>
        </tr>`;
      })
      .join('');

    // Use reusable generateHTMLPDFReport utility from src/utils/excelCsvHandler.js
    const pdfHtmlReport = generateHTMLPDFReport(
      'Vendor Database Report',
      'Super Admin Master Vendor Directory',
      headers,
      tableRowsHtml,
      vendors.length
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="Vendor_Database_Report.pdf"');
    res.status(200).send(pdfHtmlReport);
  } catch (error) {
    res.status(500).json({ message: 'Server error during PDF export', error: error.message });
  }
};
// -----------------Block Vendor ------------------------------------------
export const blockVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await SuperAdminVendor.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    if (vendor.status === "Blocked") {
      return res.status(400).json({
        success: false,
        message: "Vendor is already blocked",
      });
    }

    vendor.status = "Blocked";
    vendor.updatedBy = req.user?._id || null;

    await vendor.save();

    await createAuditLog({
      user: req.superAdmin?.adminId || 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      action: 'Blocked Vendor',
      record: vendor.transNo || vendor.vendorId,
      module: 'Vendor Database',
    });

    return res.status(200).json({
      success: true,
      message: "Vendor blocked successfully",
      data: vendor,
    });
  } catch (error) {
    console.error("Block vendor error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to block vendor",
      error: error.message,
    });
  }
};
// -------------------- Unblock Vendor----------------------------------
export const unblockVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await SuperAdminVendor.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    if (vendor.status !== "Blocked") {
      return res.status(400).json({
        success: false,
        message: "Vendor is not blocked",
      });
    }

    vendor.status = "Active";
    vendor.updatedBy = req.user?._id || null;

    await vendor.save();
    await createAuditLog({
      user: req.superAdmin?.adminId || 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      action: 'Unblocked Vendor',
      record: vendor.transNo || vendor.vendorId,
      module: 'Vendor Database',
    });

    return res.status(200).json({
      success: true,
      message: "Vendor unblocked successfully",
      data: vendor,
    });
  } catch (error) {
    console.error("Unblock vendor error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to unblock vendor",
      error: error.message,
    });
  }
};

