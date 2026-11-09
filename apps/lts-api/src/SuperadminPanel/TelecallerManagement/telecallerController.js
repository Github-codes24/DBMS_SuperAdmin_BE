import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Telecaller from './telecallerSchema.js';
import TelecallerAuthModel from '../../Telecaller/models/Telecaller.js';
import User from '../UserManagement/userSchema.js';
import Customer from '../CustomerDatabase/customerSchema.js';
import {
  parseExcelOrCsvBuffer,
  filterUniqueRecords,
  generateCSVData,
  generateHTMLPDFReport,
} from '../../utils/excelCsvHandler.js';
import { createAuditLog } from '../../utils/auditLogger.js';
import { sendTelecallerCredentialsEmail } from '../../utils/emailHandler.js';

// Phone Number & Email Validation Helpers (Supports country codes, symbols +, -, (), spaces, and 7 to 15 digits)
const validateMobileNumber = (mobileStr) => {
  if (!mobileStr) return false;
  // Clean string: remove spaces, dashes, dots, parentheses, and plus sign
  const digitsOnly = mobileStr.toString().replace(/[\s\-\(\)\.\+]/g, '');
  // Validates digits count between 7 and 15 digits (E.164 international standard)
  const mobileRegex = /^\d{7,15}$/;
  return mobileRegex.test(digitsOnly);
};

const validateEmail = (emailStr) => {
  if (!emailStr) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(emailStr.toString().trim());
};

// Helper to generate auto-increment Telecaller ID (TC001, TC002, TC003...) safely
export const generateTelecallerId = async () => {
  const existingTelecallers = await Telecaller.find({}).select('userId');

  let maxNum = 0;
  existingTelecallers.forEach((tc) => {
    if (tc.userId) {
      const num = parseInt(tc.userId.replace(/^TC/i, ''), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });

  const nextNum = maxNum > 0 ? maxNum + 1 : 1;
  return `TC${nextNum.toString().padStart(3, '0')}`;
};

// Helper to safely find Telecaller by Mongo _id, custom userId ('TC014'), email, or mobileNumber
// Also checks TelecallerAuthModel (telecallers collection) in case the _id is from the auth collection
const findTelecallerByIdOrCustomId = async (identifier) => {
  if (!identifier) return null;
  const str = identifier.toString().trim();
  const isObjId = mongoose.Types.ObjectId.isValid(str);

  const query = isObjId
    ? { $or: [{ _id: str }, { userId: str }, { email: str.toLowerCase() }, { mobileNumber: str }], isDeleted: false }
    : { $or: [{ userId: str }, { email: str.toLowerCase() }, { mobileNumber: str }], isDeleted: false };

  let telecaller = await Telecaller.findOne(query);

  if (!telecaller) {
    const authQuery = isObjId
      ? { $or: [{ _id: str }, { employeeId: str }, { email: str.toLowerCase() }, { phone: str }] }
      : { $or: [{ employeeId: str }, { email: str.toLowerCase() }, { phone: str }] };

    const authRecord = await TelecallerAuthModel.findOne(authQuery);
    if (authRecord) {
      telecaller = await Telecaller.findOne({
        $or: [
          { email: authRecord.email.toLowerCase() },
          { mobileNumber: authRecord.phone },
          { userId: authRecord.employeeId },
        ],
        isDeleted: false,
      });

      if (!telecaller) {
        telecaller = await Telecaller.create({
          userId: authRecord.employeeId || 'TC000',
          fullName: authRecord.name,
          mobileNumber: authRecord.phone,
          email: authRecord.email.toLowerCase(),
          password: authRecord.password || 'Tc@123456',
          status: 'Pending',
          createdByVendor: authRecord.createdByVendor || null,
          isDeleted: false,
        });
      }
    }
  }

  return telecaller;
};

// Normalize status string for consistent formatting
const normalizeStatus = (status) => {
  if (!status) return 'Pending';
  const normalized = status.toString().trim().toLowerCase();
  const statusMap = {
    active: 'Active',
    blocked: 'Blocked',
    disabled: 'Disabled',
    pending: 'Pending',
    inactive: 'Disabled',
  };
  return statusMap[normalized] || 'Pending';
};

// 1. GET ALL TELECALLERS DIRECTORY
// @desc    Get All Telecallers Directory (Search, Filter, Pagination, Assigned Customers Count)
// @route   GET /api/v1/superadmin/telecallers
// @access  Private (SuperAdmin)
export const getTelecallers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const { search, status, region } = req.query;

    const query = { isDeleted: false };

    // Search filter across fullName, userId (TC ID), mobileNumber, email, assignedRegion
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: searchRegex },
        { userId: searchRegex },
        { mobileNumber: searchRegex },
        { email: searchRegex },
        { assignedRegion: searchRegex },
      ];
    }

    if (status && status.trim()) {
      query.status = normalizeStatus(status);
    }

    if (region && region.trim()) {
      query.assignedRegion = new RegExp(region.trim(), 'i');
    }

    const totalTelecallers = await Telecaller.countDocuments(query);
    const activeTelecallersCount = await Telecaller.countDocuments({ isDeleted: false, status: 'Active' });

    const telecallers = await Telecaller.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    // Dynamically calculate assigned customers count for each telecaller
    const customerCountsByTC = await Customer.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$assignedTelecaller', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    customerCountsByTC.forEach((item) => {
      if (item._id) {
        countMap[item._id.trim()] = item.count;
      }
    });

    const telecallersWithCounts = telecallers.map((tc) => {
      const obj = tc.toObject();
      obj.assignedCustomersCount = countMap[tc.userId] || 0;
      return obj;
    });

    res.json({
      totalTelecallers,
      activeTelecallersCount,
      totalPages: Math.ceil(totalTelecallers / limit),
      currentPage: page,
      limit,
      telecallers: telecallersWithCounts,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 2. CREATE SINGLE TELECALLER ACCOUNT
// @desc    Create Single Telecaller Account (Manual "+ Add Telecaller")
// @route   POST /api/v1/superadmin/telecallers
// @access  Private (SuperAdmin)
export const createTelecaller = async (req, res) => {
  const {
    userId,
    fullName,
    mobileNumber,
    email,
    password,
    assignedRegion,
    status = 'Pending',
  } = req.body;

  try {
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ message: 'Full Name is required' });
    }

    if (!mobileNumber || !mobileNumber.trim()) {
      return res.status(400).json({ message: 'Mobile Number is required' });
    }

    if (!validateMobileNumber(mobileNumber)) {
      return res.status(400).json({ message: 'Invalid Mobile Number format. Please enter a valid mobile number (7 to 15 digits)' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email Address is required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid Email Address format' });
    }

    if (!password || !password.trim()) {
      return res.status(400).json({ message: 'Initial Password is required for telecaller login credentials' });
    }

    // Check mobile number uniqueness across both Telecaller and User collections
    const cleanDigits = (p) => p.toString().replace(/[\s\-\(\)\.\+]/g, '');
    const targetDigits = cleanDigits(mobileNumber);

    const [allUsers, allTcs] = await Promise.all([
      User.find({ isDeleted: false }).select('phone'),
      Telecaller.find({ isDeleted: false }).select('mobileNumber'),
    ]);

    const existingUserMobile = allUsers.some((u) => u.phone && cleanDigits(u.phone) === targetDigits);
    const existingTcMobile = allTcs.some((tc) => tc.mobileNumber && cleanDigits(tc.mobileNumber) === targetDigits);

    if (existingUserMobile || existingTcMobile) {
      return res.status(400).json({ message: 'A user or telecaller with this mobile number already exists' });
    }

    // Check email uniqueness across both Telecaller and User collections
    const targetEmail = email.trim().toLowerCase();
    const [exUserEmail, exTcEmail] = await Promise.all([
      User.findOne({ email: targetEmail, isDeleted: false }),
      Telecaller.findOne({ email: targetEmail, isDeleted: false }),
    ]);

    if (exUserEmail || exTcEmail) {
      return res.status(400).json({ message: 'A user or telecaller with this email address already exists' });
    }

    const autoUserId = userId && userId.trim() ? userId.trim() : await generateTelecallerId();
    const initialStatus = status ? normalizeStatus(status) : 'Pending';

    const telecaller = await Telecaller.create({
      userId: autoUserId,
      fullName: fullName.trim(),
      mobileNumber: mobileNumber.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim(),
      assignedRegion: assignedRegion ? assignedRegion.trim() : '',
      status: initialStatus,
      createdBy: req.superAdmin._id,
    });

    // Sync to Telecaller auth model in src/Telecaller/models/Telecaller.js
    try {
      await TelecallerAuthModel.findOneAndUpdate(
        {
          $or: [
            { email: email.trim().toLowerCase() },
            { phone: mobileNumber.trim() },
            { employeeId: autoUserId },
          ],
        },
        {
          name: fullName.trim(),
          employeeId: autoUserId,
          email: email.trim().toLowerCase(),
          phone: mobileNumber.trim(),
          password: password.trim(),
          role: 'TELECALLER',
          status: initialStatus === 'Active' ? 'ACTIVE' : 'PENDING',
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
    } catch (authErr) {
      console.error('TelecallerAuthModel sync error on create:', authErr.message);
    }

    const resultObj = telecaller.toObject();
    delete resultObj.password;
    resultObj.assignedCustomersCount = 0;

    // Trigger Credentials Email Service only if created as Active
    let emailSent = false;
    let emailError = null;

    
    if (initialStatus === 'Active' && telecaller.email) {
      const emailResult = await sendTelecallerCredentialsEmail({
        toEmail: telecaller.email,
        telecallerName: telecaller.fullName,
        telecallerId: telecaller.userId,
        password: password.trim(),
      });

        if (emailResult.success) {
          emailSent = true;
        } else {
          emailError = emailResult.error || 'Failed to dispatch email';
        }
      } else {
        emailError = 'Telecaller email address was not provided.';
      }
    
    const responseMessage = initialStatus === 'Active'
      ? (emailSent ? 'Telecaller account created and activated successfully' : 'Telecaller account created as Active, but credentials email could not be sent.')
      : 'Telecaller account created successfully. Account is pending activation by Super Admin.';

    res.status(201).json({
      success: true,
      message: responseMessage,
      data: {
        telecallerId: telecaller.userId,
        email: telecaller.email || '',
        status: telecaller.status,
        emailSent: emailSent,
        ...(emailError && { emailError: emailError }),
        telecaller: resultObj,
      },
    });
    }
   catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}


// 3. GET SINGLE TELECALLER BY ID
// @desc    Get Single Telecaller by Mongo _id, custom userId ('TC014'), email, or mobileNumber
// @route   GET /api/v1/superadmin/telecallers/:id
// @access  Private (SuperAdmin)
export const getTelecallerById = async (req, res) => {
  try {
    const { id } = req.params;
    const telecaller = await findTelecallerByIdOrCustomId(id);

    if (!telecaller) {
      return res.status(404).json({ message: 'Telecaller account not found' });
    }

    const assignedCustomersCount = await Customer.countDocuments({
      assignedTelecaller: telecaller.userId,
      isDeleted: false,
    });

    const resultObj = telecaller.toObject();
    delete resultObj.password;
    resultObj.assignedCustomersCount = assignedCustomersCount;

    res.json(resultObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 4. MANAGE / UPDATE TELECALLER ACCOUNT
// @desc    Manage Telecaller Profile (Mobile, Email, Region, Status, Reset Password)
// @route   PATCH /api/v1/superadmin/telecallers/:id
// @access  Private (SuperAdmin)
export const updateTelecaller = async (req, res) => {
  const { id } = req.params;
  try {
    const telecaller = await findTelecallerByIdOrCustomId(id);
    if (!telecaller) {
      return res.status(404).json({ message: 'Telecaller account not found' });
    }
    const {
      fullName,
      mobileNumber,
      email,
      assignedRegion,
      status,
      password, // Password field
    } = req.body;

    // Allow status changes even when the telecaller is blocked or inactive.
    const isInactiveOrBlocked = [
      'DISABLED',
      'Disabled',
      'BLOCKED',
      'Blocked',
    ].includes(telecaller.status);

    const isUpdatingProfile =
      fullName !== undefined ||
      mobileNumber !== undefined ||
      email !== undefined ||
      assignedRegion !== undefined ||
      (password !== undefined && password.trim());

    if (isInactiveOrBlocked && isUpdatingProfile && status === undefined) {
      return res.status(403).json({
        message:
          'Disabled or blocked telecallers cannot have their profile details updated',
      });
    }

    if (mobileNumber !== undefined && mobileNumber.trim()) {
      if (!validateMobileNumber(mobileNumber)) {
        return res.status(400).json({ message: 'Invalid Mobile Number format. Please enter a valid mobile number (7 to 15 digits)' });
      }
      // Check duplicate mobile number against other telecallers
      const existingMobile = await Telecaller.findOne({
        mobileNumber: mobileNumber.trim(),
        _id: { $ne: telecaller._id },
        isDeleted: false,
      });
      if (existingMobile) {
        return res.status(400).json({ message: 'Another telecaller is already registered with this mobile number' });
      }
      telecaller.mobileNumber = mobileNumber.trim();
    }

    if (email !== undefined && email.trim()) {
      if (!validateEmail(email)) {
        return res.status(400).json({ message: 'Invalid Email Address format' });
      }
      // Check duplicate email against other telecallers
      const existingEmail = await Telecaller.findOne({
        email: email.trim().toLowerCase(),
        _id: { $ne: telecaller._id },
        isDeleted: false,
      });
      if (existingEmail) {
        return res.status(400).json({ message: 'Another telecaller is already registered with this email address' });
      }
      telecaller.email = email.trim().toLowerCase();
    }

    const previousStatus = (telecaller.status || '').toUpperCase();
    const wasPending = previousStatus === 'PENDING' || previousStatus === 'INACTIVE';
    const isBecomingActive = status !== undefined && normalizeStatus(status) === 'Active';

    if (fullName) telecaller.fullName = fullName.trim();
    if (assignedRegion !== undefined) telecaller.assignedRegion = assignedRegion.trim();
    if (status !== undefined) telecaller.status = normalizeStatus(status);

    let rawPasswordForActivation = null;
    let passwordWasReset = false;

    // If Super Admin is activating a Pending telecaller to Active:
    // Create/assign User (userId) and Password, and send them via mail!
    if (wasPending && isBecomingActive) {
      if (!telecaller.userId || telecaller.userId === 'TC000') {
        telecaller.userId = await generateTelecallerId();
      }
      rawPasswordForActivation = (password && password.trim()) || `Tc@${Math.floor(100000 + Math.random() * 900000)}`;
      telecaller.password = rawPasswordForActivation;
      passwordWasReset = true;
    } else if (password && password.trim()) {
      const isSamePassword = await telecaller.matchPassword(password.trim());
      if (isSamePassword) {
        return res.status(400).json({ message: 'New password cannot be the same as the current password' });
      }
      telecaller.password = password.trim();
      passwordWasReset = true;
    }

    telecaller.updatedBy = req.superAdmin._id;
    await telecaller.save();

    // Sync to Telecaller auth model in src/Telecaller/models/Telecaller.js
    try {
      const authUpdates = {
        status: telecaller.status === 'Active' ? 'ACTIVE' : telecaller.status === 'Pending' ? 'PENDING' : 'INACTIVE',
      };
      if (fullName) authUpdates.name = fullName.trim();
      if (telecaller.userId) authUpdates.employeeId = telecaller.userId;
      if (rawPasswordForActivation) authUpdates.password = rawPasswordForActivation;
      else if (passwordWasReset) authUpdates.password = password.trim();
      if (telecaller.email) authUpdates.email = telecaller.email.toLowerCase();
      if (telecaller.mobileNumber) authUpdates.phone = telecaller.mobileNumber;

      await TelecallerAuthModel.findOneAndUpdate(
        {
          $or: [
            { email: telecaller.email.toLowerCase() },
            { phone: telecaller.mobileNumber },
            { employeeId: telecaller.userId },
          ],
        },
        authUpdates
      );
    } catch (authErr) {
      console.error('TelecallerAuthModel sync error on update:', authErr.message);
    }

    // Send credentials email if telecaller was activated from Pending -> Active
    if (wasPending && isBecomingActive && telecaller.email) {
      try {
        await sendTelecallerCredentialsEmail({
          toEmail: telecaller.email,
          telecallerName: telecaller.fullName,
          telecallerId: telecaller.userId,
          password: rawPasswordForActivation,
        });
      } catch (mailErr) {
        console.error('Failed to dispatch telecaller credentials email on update:', mailErr.message);
      }
    }

    // Automatic Audit Log Recording
    await createAuditLog({
      user: req.superAdmin?.adminId || 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      action: wasPending && isBecomingActive ? 'Activated Telecaller' : (passwordWasReset ? 'Changed Password' : 'Updated Telecaller'),
      record: telecaller.userId,
      module: 'Telecaller Management',
    });

    const assignedCustomersCount = await Customer.countDocuments({
      assignedTelecaller: telecaller.userId,
      isDeleted: false,
    });

    const resultObj = telecaller.toObject();
    delete resultObj.password;
    resultObj.assignedCustomersCount = assignedCustomersCount;

    res.json({
      message: wasPending && isBecomingActive
        ? 'Telecaller activated and login credentials sent successfully via email.'
        : 'Telecaller profile updated successfully',
      telecaller: resultObj,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const bulkUpdateTelecallerStatus = async (req, res) => {
  const { telecallers: telecallerRecords, telecallerIds, status: sharedStatus } = req.body || {};
  const allowedStatuses = ['Active', 'Disabled', 'Blocked', 'Pending'];
  const maxBulkUpdateCount = 24;
  const usesRecordPayload = Array.isArray(telecallerRecords);
  const records = usesRecordPayload
    ? telecallerRecords
    : Array.isArray(telecallerIds)
      ? telecallerIds.map((id) => ({ _id: id, status: sharedStatus }))
      : null;

  if (!records || records.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'telecallers must be a non-empty array of telecaller records',
    });
  }
  if (records.length > maxBulkUpdateCount) {
    return res.status(400).json({
      success: false,
      message: `Maximum ${maxBulkUpdateCount} telecallers can be updated at once`,
    });
  }

  const recordsWithIds = records.map((record) => ({
    record,
    id: String(record?._id || record?.mongoId || record?.id || ''),
    status: record?.status || sharedStatus,
  }));
  const invalidIds = recordsWithIds
    .filter(({ id, status }) => !mongoose.Types.ObjectId.isValid(id) || !allowedStatuses.includes(status))
    .map(({ id }) => id || '(missing ID)');
  if (invalidIds.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'One or more telecaller records have an invalid ID or status',
      invalidIds,
    });
  }

  try {
    const uniqueIds = [...new Set(recordsWithIds.map(({ id }) => id))];
    const telecallers = await Telecaller.find({
      _id: { $in: uniqueIds },
      isDeleted: false,
    });
    const telecallersById = new Map(
      telecallers.map((telecaller) => [String(telecaller._id), telecaller])
    );
    const failures = [];
    const updateResults = await Promise.allSettled(recordsWithIds.map(async ({ id, status: recordStatus }) => {
      const telecaller = telecallersById.get(id);
      if (!telecaller) {
        throw new Error('Telecaller not found or deleted');
      }

      const wasPending = (telecaller.status || '').toUpperCase() === 'PENDING';
      const isBecomingActive = recordStatus === 'Active';
      let rawPasswordForActivation = null;

      if (wasPending && isBecomingActive) {
        if (!telecaller.userId || telecaller.userId === 'TC000') {
          telecaller.userId = await generateTelecallerId();
        }
        rawPasswordForActivation = `Tc@${Math.floor(100000 + Math.random() * 900000)}`;
        telecaller.password = rawPasswordForActivation;
      }

      telecaller.status = recordStatus;
      telecaller.updatedBy = req.superAdmin?._id;
      await telecaller.save();

      // Sync to auth model
      try {
        const authUpdates = {
          status: recordStatus === 'Active' ? 'ACTIVE' : recordStatus === 'Pending' ? 'PENDING' : 'INACTIVE',
        };
        if (telecaller.userId) authUpdates.employeeId = telecaller.userId;
        if (rawPasswordForActivation) authUpdates.password = rawPasswordForActivation;

        await TelecallerAuthModel.findOneAndUpdate(
          {
            $or: [
              { email: telecaller.email.toLowerCase() },
              { phone: telecaller.mobileNumber },
              { employeeId: telecaller.userId },
            ],
          },
          authUpdates
        );
      } catch (e) {
        console.error('TelecallerAuthModel bulk sync error:', e.message);
      }

      // Send email if activated
      if (wasPending && isBecomingActive && telecaller.email) {
        try {
          await sendTelecallerCredentialsEmail({
            toEmail: telecaller.email,
            telecallerName: telecaller.fullName,
            telecallerId: telecaller.userId,
            password: rawPasswordForActivation,
          });
        } catch (mailErr) {
          console.error('Failed to send credentials email on bulk activate:', mailErr.message);
        }
      }

      await createAuditLog({
        user: req.superAdmin?.adminId || 'SUPER',
        userName: req.superAdmin?.name || 'Super Admin',
        userRole: req.superAdmin?.role || 'SUPER_ADMIN',
        action: wasPending && isBecomingActive ? 'Activated Telecaller' : `Bulk status update to ${recordStatus}`,
        record: telecaller.userId,
        module: 'Telecaller Management',
      });
      return id;
    }));
    const updatedIds = [];
    updateResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        updatedIds.push(result.value);
      } else {
        failures.push({
          telecallerId: recordsWithIds[index].id,
          message: result.reason?.message || 'Failed to update telecaller status',
        });
      }
    });

    return res.status(200).json({
      success: failures.length === 0,
      message: failures.length === 0
        ? `Status updated for ${updatedIds.length} telecaller${updatedIds.length === 1 ? '' : 's'}`
        : `Status updated for ${updatedIds.length} telecaller${updatedIds.length === 1 ? '' : 's'}; ${failures.length} failed`,
      data: {
        requestedCount: records.length,
        updatedCount: updatedIds.length,
        updatedIds,
        failures,
        status: sharedStatus || null,
      },
    });
  } catch (error) {
    console.error('Bulk telecaller status update failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update selected telecaller statuses',
      error: error.message,
    });
  }
};

// 5. BULK IMPORT TELECALLERS (DIRECT EXCEL/CSV FILE OR JSON PAYLOAD)
// @desc    Bulk Import Telecallers from Excel / CSV Data (.xlsx, .csv, 50MB Limit & Validation)
// @route   POST /api/v1/superadmin/telecallers/import
// @access  Private (SuperAdmin)
export const importTelecallers = async (req, res) => {
  try {
    let telecallersPayload = req.body?.telecallers || req.body?.data;

    console.log('Import route reached');

    // Direct Binary Excel / CSV file upload via multer (req.file or req.files)
    const uploadedFile = req.file || (Array.isArray(req.files) && req.files.length > 0 ? req.files[0] : null);
    if (uploadedFile && uploadedFile.buffer) {
      telecallersPayload = parseExcelOrCsvBuffer(uploadedFile.buffer);
    }

    if (!Array.isArray(telecallersPayload) || telecallersPayload.length === 0) {
      return res.status(400).json({ message: 'Please attach a valid Excel/CSV file (.xlsx, .xls, .csv) or provide a non-empty array of telecaller records' });
    }

    // Helper to clean phone digits
    const cleanPhoneDigits = (phoneStr) => (phoneStr ? phoneStr.toString().replace(/[\s\-\(\)\.\+]/g, '') : '');

    // Fetch all existing records from both User and Telecaller collections for duplicate checking
    const [existingTcs, existingUsers] = await Promise.all([
      Telecaller.find({ isDeleted: false }).select('email mobileNumber userId'),
      User.find({ isDeleted: false }).select('email phone userId'),
    ]);

    const existingEmailsSet = new Set([
      ...existingTcs.map((r) => (r.email || '').toLowerCase().trim()),
      ...existingUsers.map((r) => (r.email || '').toLowerCase().trim()),
    ].filter(Boolean));

    const existingMobilesSet = new Set([
      ...existingTcs.map((r) => cleanPhoneDigits(r.mobileNumber)),
      ...existingUsers.map((r) => cleanPhoneDigits(r.phone)),
    ].filter(Boolean));

    const existingUserIdsSet = new Set([
      ...existingTcs.map((r) => (r.userId || '').toLowerCase().trim()),
      ...existingUsers.map((r) => (r.userId || '').toLowerCase().trim()),
    ].filter(Boolean));

    // Filter incoming payload against existing email, mobile, userId and batch duplicates
    const uniqueRecords = [];
    let skippedDuplicatesCount = 0;
    const batchEmailsSet = new Set();
    const batchMobilesSet = new Set();
    const batchUserIdsSet = new Set();

    for (const item of telecallersPayload) {
      if (!item) {
        skippedDuplicatesCount++;
        continue;
      }

      const email = (item.email || item.Email || item['Email Address'] || '').toString().trim().toLowerCase();
      const mobile = (item.mobileNumber || item.MobileNumber || item['Mobile Number'] || item.Phone || '').toString().trim();
      const uId = (item.userId || item.UserId || item['Telecaller ID'] || item['TC ID'] || '').toString().trim().toLowerCase();

      const mobileDigits = cleanPhoneDigits(mobile);

      // Check DB & Batch Duplicates
      const isDuplicateEmail = email && (existingEmailsSet.has(email) || batchEmailsSet.has(email));
      const isDuplicateMobile = mobileDigits && (existingMobilesSet.has(mobileDigits) || batchMobilesSet.has(mobileDigits));
      const isDuplicateUserId = uId && (existingUserIdsSet.has(uId) || batchUserIdsSet.has(uId));

      if (isDuplicateEmail || isDuplicateMobile || isDuplicateUserId) {
        skippedDuplicatesCount++;
        continue;
      }

      // Record in batch sets
      if (email) batchEmailsSet.add(email);
      if (mobileDigits) batchMobilesSet.add(mobileDigits);
      if (uId) batchUserIdsSet.add(uId);

      uniqueRecords.push(item);
    }

    if (uniqueRecords.length === 0) {
      return res.status(200).json({
        message: `All ${telecallersPayload.length} records in the uploaded file already exist in the database. 0 new records were imported.`,
        importedCount: 0,
        skippedDuplicatesCount: telecallersPayload.length,
      });
    }

    let maxNum = 0;
    existingTcs.forEach((tc) => {
      if (tc.userId) {
        const num = parseInt(tc.userId.replace(/^TC/i, ''), 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    let currentTcNum = maxNum + 1;

    const defaultSalt = await bcrypt.genSalt(10);
    const defaultHashedPassword = await bcrypt.hash('Telecaller@123', defaultSalt);

    const newTelecallerEntries = await Promise.all(
      uniqueRecords.map(async (tc) => {
        let userId = (tc.userId || tc.UserId || tc['Telecaller ID'] || tc['TC ID'] || '').toString().trim();
        if (!userId) {
          while (existingUserIdsSet.has(`tc${currentTcNum.toString().padStart(3, '0')}`)) {
            currentTcNum++;
          }
          userId = `TC${currentTcNum.toString().padStart(3, '0')}`;
          currentTcNum++;
        }
        existingUserIdsSet.add(userId.toLowerCase());

        const fullName = (tc.fullName || tc.FullName || tc['Full Name'] || tc.Name || 'Unnamed Telecaller').toString().trim();
        const mobileNumber = (tc.mobileNumber || tc.MobileNumber || tc['Mobile Number'] || tc.Phone || '').toString().trim();
        const email = (tc.email || tc.Email || tc['Email Address'] || `tc${currentTcNum}@lts.com`).toString().trim().toLowerCase();
        const assignedRegion = (tc.assignedRegion || tc.AssignedRegion || tc['Assigned Region'] || tc.Region || '').toString().trim();
        const status = normalizeStatus(tc.status || tc.Status);

        const rawPassword = tc.password || tc.Password || tc['Initial Password'] || tc['Password'];
        const hashedPassword = rawPassword ? await bcrypt.hash(rawPassword.toString().trim(), defaultSalt) : defaultHashedPassword;

        return {
          userId,
          fullName,
          mobileNumber,
          email,
          password: hashedPassword,
          assignedRegion,
          status,
          createdBy: req.superAdmin._id,
        };
      })
    );

    const insertedTelecallers = await Telecaller.insertMany(newTelecallerEntries);

    res.status(201).json({
      message: `Import completed successfully: ${insertedTelecallers.length} unique telecaller accounts created. ${skippedDuplicatesCount} duplicate/invalid records were discarded.`,
      importedCount: insertedTelecallers.length,
      skippedDuplicatesCount,
      telecallers: insertedTelecallers,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during import', error: error.message });
  }
};

// 6. EXPORT TELECALLERS TO CSV (.csv)
// @desc    Export Telecallers to CSV Format (.csv)
// @route   GET /api/v1/superadmin/telecallers/export/csv
// @access  Private (SuperAdmin)
export const exportTelecallersCSV = async (req, res) => {
  try {
    const telecallers = await Telecaller.find({ isDeleted: false }).sort({ createdAt: 1 });

    const headers = ['Telecaller ID', 'Full Name', 'Mobile Number', 'Email Address', 'Assigned Region', 'Status'];

    const rowsData = telecallers.map((tc) => [
      tc.userId || '',
      tc.fullName || '',
      tc.mobileNumber || '',
      tc.email || '',
      tc.assignedRegion || '',
      tc.status || 'Active',
    ]);

    const csvContent = generateCSVData(headers, rowsData);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Telecaller_Directory.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Server error during CSV export', error: error.message });
  }
};

// 7. EXPORT TELECALLERS TO PDF REPORT
// @desc    Export Telecallers to PDF Format (Report view)
// @route   GET /api/v1/superadmin/telecallers/export/pdf
// @access  Private (SuperAdmin)
export const exportTelecallersPDF = async (req, res) => {
  try {
    const telecallers = await Telecaller.find({ isDeleted: false }).sort({ createdAt: 1 });

    const headers = ['TC ID', 'FULL NAME', 'MOBILE NUMBER', 'EMAIL ADDRESS', 'REGION', 'STATUS'];

    const tableRowsHtml = telecallers
      .map((tc) => {
        const statusColor = tc.status === 'Disabled' ? '#dc2626' : '#16a34a';
        return `
        <tr>
          <td><strong style="color: #ea580c;">${tc.userId}</strong></td>
          <td><strong>${tc.fullName}</strong></td>
          <td>${tc.mobileNumber}</td>
          <td>${tc.email}</td>
          <td>${tc.assignedRegion || '-'}</td>
          <td style="color: ${statusColor}; font-weight: bold;">${tc.status}</td>
        </tr>`;
      })
      .join('');

    const pdfHtmlReport = generateHTMLPDFReport(
      'Telecaller Management Report',
      'Super Admin Telecaller Directory',
      headers,
      tableRowsHtml,
      telecallers.length
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="Telecaller_Directory_Report.pdf"');
    res.status(200).send(pdfHtmlReport);
  } catch (error) {
    res.status(500).json({ message: 'Server error during PDF export', error: error.message });
  }
};

//---------------------------------- block the telecaller ---------------------------------------------
export const blockTelecaller = async (req, res) => {
  const { id } = req.params;
  try {
    const telecaller = await findTelecallerByIdOrCustomId(id);

    if (!telecaller) {
      return res.status(404).json({
        success: false,
        message: "Telecaller account not found",
      });
    }

    // Check status in both schemas
    const authRecord = await TelecallerAuthModel.findOne({
      $or: [
        { email: telecaller.email.toLowerCase() },
        { phone: telecaller.mobileNumber },
        { employeeId: telecaller.userId },
      ],
    });

    const isAlreadyBlocked =
      telecaller.status === "Blocked" ||
      telecaller.status === "BLOCKED" ||
      authRecord?.status === "BLOCKED" ||
      authRecord?.status === "Blocked";

    if (isAlreadyBlocked) {
      return res.status(400).json({
        success: false,
        message: "Telecaller is already blocked",
      });
    }

    telecaller.status = "Blocked";
    telecaller.updatedBy = req.superAdmin?._id || req.user?._id || null;
    await telecaller.save();

    // Sync to Telecaller auth model in src/Telecaller/models/Telecaller.js
    try {
      await TelecallerAuthModel.findOneAndUpdate(
        {
          $or: [
            { email: telecaller.email.toLowerCase() },
            { phone: telecaller.mobileNumber },
            { employeeId: telecaller.userId },
          ],
        },
        { status: 'INACTIVE' }
      );
    } catch (authErr) {
      console.error('TelecallerAuthModel sync error on block:', authErr.message);
    }

    await createAuditLog({
      user: req.superAdmin?.adminId || "SUPER",
      userName: req.superAdmin?.name || "Super Admin",
      userRole: req.superAdmin?.role || "SUPER_ADMIN",
      action: "Blocked Telecaller",
      record: telecaller.userId,
      module: "Telecaller Management",
    });

    return res.status(200).json({
      success: true,
      message: "Telecaller blocked successfully in both schemas",
      telecaller: {
        userId: telecaller.userId,
        fullName: telecaller.fullName,
        status: telecaller.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to block telecaller",
      error: error.message,
    });
  }
};

//---------------------- unblock the telecaller -------------------------------------------------------
export const unblockTelecaller = async (req, res) => {
  const { id } = req.params;

  try {
    const telecaller = await findTelecallerByIdOrCustomId(id);

    if (!telecaller) {
      return res.status(404).json({
        success: false,
        message: "Telecaller account not found",
      });
    }

    const authRecord = await TelecallerAuthModel.findOne({
      $or: [
        { email: telecaller.email.toLowerCase() },
        { phone: telecaller.mobileNumber },
        { employeeId: telecaller.userId },
      ],
    });

    const isNotBlocked =
      telecaller.status !== "Blocked" &&
      telecaller.status !== "BLOCKED" &&
      authRecord?.status !== "BLOCKED" &&
      authRecord?.status !== "Blocked";

    if (isNotBlocked) {
      return res.status(400).json({
        success: false,
        message: "Telecaller is not blocked",
      });
    }

    telecaller.status = "Active";
    telecaller.updatedBy = req.superAdmin?._id || req.user?._id || null;
    await telecaller.save();

    // Sync to Telecaller auth model in src/Telecaller/models/Telecaller.js
    try {
      await TelecallerAuthModel.findOneAndUpdate(
        {
          $or: [
            { email: telecaller.email.toLowerCase() },
            { phone: telecaller.mobileNumber },
            { employeeId: telecaller.userId },
          ],
        },
        { status: 'ACTIVE' }
      );
    } catch (authErr) {
      console.error('TelecallerAuthModel sync error on unblock:', authErr.message);
    }

    await createAuditLog({
      user: req.superAdmin?.adminId || "SUPER",
      userName: req.superAdmin?.name || "Super Admin",
      userRole: req.superAdmin?.role || "SUPER_ADMIN",
      action: "Unblocked Telecaller",
      record: telecaller.userId,
      module: "Telecaller Management",
    });

    return res.status(200).json({
      success: true,
      message: "Telecaller unblocked successfully in both schemas",
      telecaller: {
        userId: telecaller.userId,
        fullName: telecaller.fullName,
        status: telecaller.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to unblock telecaller",
      error: error.message,
    });
  }
};

// ---------------------- activate telecaller ---------------------------------------------------------
// @desc    Activate Telecaller account by Super Admin (Grants login access and dispatches credentials via email)
// @route   PATCH /api/v1/superadmin/telecallers/:id/activate
// @access  Private (SuperAdmin)
export const activateTelecaller = async (req, res) => {
  const { id } = req.params;

  try {
    const telecaller = await findTelecallerByIdOrCustomId(id);

    if (!telecaller) {
      return res.status(404).json({
        success: false,
        message: 'Telecaller account not found',
      });
    }

    if (telecaller.status === 'Active' && !req.body?.force) {
      return res.status(400).json({
        success: false,
        message: 'Telecaller is already active',
      });
    }

    if (!telecaller.email) {
      return res.status(400).json({
        success: false,
        message: 'Telecaller cannot be activated because no email address is available.',
      });
    }

    // Ensure User / userId is created/assigned if missing or temporary
    if (!telecaller.userId || telecaller.userId === 'TC000') {
      telecaller.userId = await generateTelecallerId();
    }

    // Generate login password or use custom password provided by Super Admin
    const rawPassword = req.body?.password?.trim() || `Tc@${Math.floor(100000 + Math.random() * 900000)}`;

    telecaller.status = 'Active';
    telecaller.password = rawPassword;
    telecaller.updatedBy = req.superAdmin?._id || req.user?._id || null;
    await telecaller.save();

    // Sync to Telecaller auth model in src/Telecaller/models/Telecaller.js
    try {
      const existingAuth = await TelecallerAuthModel.findOne({
        $or: [
          { email: telecaller.email.toLowerCase() },
          { phone: telecaller.mobileNumber },
          { employeeId: telecaller.userId },
        ],
      });

      if (existingAuth) {
        existingAuth.status = 'ACTIVE';
        existingAuth.password = rawPassword;
        existingAuth.name = telecaller.fullName;
        existingAuth.employeeId = telecaller.userId;
        existingAuth.email = telecaller.email.toLowerCase();
        existingAuth.phone = telecaller.mobileNumber;
        await existingAuth.save();
      } else {
        await TelecallerAuthModel.create({
          name: telecaller.fullName,
          employeeId: telecaller.userId,
          email: telecaller.email.toLowerCase(),
          phone: telecaller.mobileNumber,
          password: rawPassword,
          role: 'TELECALLER',
          status: 'ACTIVE',
        });
      }
    } catch (authSyncErr) {
      console.error('TelecallerAuthModel sync error on activate:', authSyncErr.message);
    }

    // Send credentials email - USER AND PASSWORD DISPATCHED VIA EMAIL
    const emailResult = await sendTelecallerCredentialsEmail({
      toEmail: telecaller.email,
      telecallerName: telecaller.fullName,
      telecallerId: telecaller.userId,
      password: rawPassword,
    });

    await createAuditLog({
      user: req.superAdmin?.adminId || 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      action: 'Activated Telecaller',
      record: telecaller.userId,
      module: 'Telecaller Management',
    });

    return res.status(200).json({
      success: true,
      message: emailResult.success
        ? 'Telecaller activated and login credentials sent successfully via email.'
        : 'Telecaller activated, but credentials email could not be sent.',
      data: {
        userId: telecaller.userId,
        email: telecaller.email,
        status: telecaller.status,
        emailSent: emailResult.success,
        ...(emailResult.error && { emailError: emailResult.error }),
      },
    });
  } catch (error) {
    console.error('Activate telecaller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
