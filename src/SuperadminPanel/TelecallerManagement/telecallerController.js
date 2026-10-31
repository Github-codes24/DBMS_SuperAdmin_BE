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
const generateTelecallerId = async () => {
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
// Helper to generate secure random password for activation
const generateRandomPassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%';
  let pass = '';
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

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

    const authTc = await TelecallerAuthModel.findOne(authQuery);
    if (authTc) {
      telecaller = await Telecaller.findOne({
        $or: [
          { email: authTc.email.toLowerCase() },
          { mobileNumber: authTc.phone },
          { userId: authTc.employeeId },
        ],
        isDeleted: false,
      });

      if (!telecaller) {
        telecaller = await Telecaller.create({
          userId: authTc.employeeId,
          fullName: authTc.name,
          mobileNumber: authTc.phone,
          email: authTc.email.toLowerCase(),
          password: authTc.password,
          assignedRegion: '',
          status: authTc.status === 'ACTIVE' || authTc.status === 'Active' ? 'Active' : 'Pending',
          createdBy: null,
        });
      }
    }
  }

  return telecaller;
};

// Normalize status string for consistent formatting
const normalizeStatus = (status) => {
  if (!status) return 'Pending';
  const s = String(status).trim().toLowerCase();
  if (s === 'active') return 'Active';
  if (s === 'pending') return 'Pending';
  if (s === 'blocked') return 'Blocked';
  if (s === 'disabled') return 'Disabled';
  return 'Pending';
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

    const telecaller = await Telecaller.create({
      userId: autoUserId,
      fullName: fullName.trim(),
      mobileNumber: mobileNumber.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim(),
      assignedRegion: assignedRegion ? assignedRegion.trim() : '',
      status: normalizeStatus(status),
      createdBy: req.superAdmin._id,
    });

    // Dual-schema creation: Also create in Telecaller auth model (telecallers collection)
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanMobile = mobileNumber.trim();
      const initialAuthStatus = normalizeStatus(status) === 'Active' ? 'ACTIVE' : 'PENDING';

      await TelecallerAuthModel.findOneAndUpdate(
        {
          $or: [
            { email: cleanEmail },
            { phone: cleanMobile },
            { employeeId: autoUserId },
          ],
        },
        {
          name: fullName.trim(),
          employeeId: autoUserId,
          email: cleanEmail,
          phone: cleanMobile,
          password: password.trim(),
          role: 'TELECALLER',
          status: initialAuthStatus,
          createdByVendor: null,
        },
        {
          upsert: true,
          returnDocument: 'after',
          setDefaultsOnInsert: true,
        }
      );
    } catch (authCreateErr) {
      console.error('TelecallerAuthModel dual creation error:', authCreateErr.message);
    }

    const resultObj = telecaller.toObject();
    delete resultObj.password;
    resultObj.assignedCustomersCount = 0;

    // Audit Log Recording for Super Admin creation
    await createAuditLog({
      user: req.superAdmin?.adminId || 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      actorType: 'SUPER_ADMIN',
      action: 'Created Telecaller',
      record: telecaller.userId,
      module: 'Telecaller Management',
      message: `Telecaller ${telecaller.userId} (${telecaller.fullName}) created by Super Admin: ${req.superAdmin?.name || 'Super Admin'} (${req.superAdmin?.adminId || 'SUPER'}) with status ${telecaller.status}.`,
    });

    // Trigger Credentials Email Service ONLY if activated immediately
    let emailSent = false;
    let emailError = null;

    if (telecaller.status === 'Active') {
      if (telecaller.email) {
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
    }

    const responseMessage = telecaller.status === 'Active'
      ? (emailSent
          ? 'Telecaller account created and login credentials sent successfully.'
          : 'Telecaller account created, but credentials email could not be sent.')
      : 'Telecaller account created successfully with Pending status. Login credentials will be dispatched upon activation.';

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
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
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
      password, // Password reset field
    } = req.body;
    // Allow status changes even when the telecaller is blocked or inactive.
    const isInactiveOrBlocked = [
      // 'INACTIVE',
      // 'Inactive',
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

    if (isInactiveOrBlocked && isUpdatingProfile) {
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

    if (fullName) telecaller.fullName = fullName.trim();
    if (assignedRegion !== undefined) telecaller.assignedRegion = assignedRegion.trim();
    if (status !== undefined) telecaller.status = normalizeStatus(status);

    const passwordWasReset = Boolean(password && password.trim());
    if (passwordWasReset) {
      // Validate that new password is not identical to current password
      const isSamePassword = await telecaller.matchPassword(password.trim());
      if (isSamePassword) {
        return res.status(400).json({ message: 'New password cannot be the same as the current password' });
      }
      telecaller.password = password.trim();
    }

    telecaller.updatedBy = req.superAdmin._id;
    await telecaller.save();

    // Sync update to Telecaller auth model (telecallers collection)
    try {
      const mappedStatus =
        telecaller.status === 'Active'
          ? 'ACTIVE'
          : telecaller.status === 'Blocked'
            ? 'BLOCKED'
            : telecaller.status === 'Disabled'
              ? 'INACTIVE'
              : 'PENDING';

      const authUpdates = { status: mappedStatus };
      if (fullName) authUpdates.name = fullName.trim();
      if (passwordWasReset) authUpdates.password = password.trim();
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
    } catch (syncErr) {
      console.error('TelecallerAuthModel sync error on update:', syncErr.message);
    }

    // Automatic Audit Log Recording
    await createAuditLog({
      user: req.superAdmin?.adminId || 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      action: passwordWasReset ? 'Changed Password' : 'Updated Telecaller',
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
      message: 'Telecaller profile updated successfully',
      telecaller: resultObj,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const bulkUpdateTelecallerStatus = async (req, res) => {
  const { telecallers: telecallerRecords, telecallerIds, status: sharedStatus } = req.body || {};
  const allowedStatuses = ['Active', 'Disabled', 'Blocked'];
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
      telecaller.status = recordStatus;
      telecaller.updatedBy = req.superAdmin?._id;
      await telecaller.save();

      try {
        const mappedBulkStatus =
          recordStatus === 'Active' ? 'ACTIVE' : recordStatus === 'Blocked' ? 'BLOCKED' : 'INACTIVE';

        await TelecallerAuthModel.findOneAndUpdate(
          {
            $or: [
              { email: telecaller.email.toLowerCase() },
              { phone: telecaller.mobileNumber },
              { employeeId: telecaller.userId },
            ],
          },
          { status: mappedBulkStatus }
        );
      } catch (bulkSyncErr) {
        console.error('TelecallerAuthModel bulk sync error:', bulkSyncErr.message);
      }
      await createAuditLog({
        user: req.superAdmin?.adminId || 'SUPER',
        userName: req.superAdmin?.name || 'Super Admin',
        userRole: req.superAdmin?.role || 'SUPER_ADMIN',
        action: `Bulk status update to ${recordStatus}`,
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

    // Determine starting numeric part for custom TCxxx ID generation
    // let maxNum = 0;
    // existingRecords.forEach((tc) => {
    //   if (tc.userId) {
    //     const num = parseInt(tc.userId.replace(/^TC/i, ''), 10);
    //     if (!isNaN(num) && num > maxNum) maxNum = num;
    //   }
    // });

    // let currentTcNum = maxNum > 0 ? maxNum + 1 : 1;

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
      uniqueRecords.map(async (tc, index) => {
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

    // Sync block status to Telecaller auth model in telecallers collection
    await TelecallerAuthModel.findOneAndUpdate(
      {
        $or: [
          { email: telecaller.email.toLowerCase() },
          { phone: telecaller.mobileNumber },
          { employeeId: telecaller.userId },
        ],
      },
      { status: "BLOCKED" }
    );

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

    // Sync active status to Telecaller auth model in telecallers collection
    await TelecallerAuthModel.findOneAndUpdate(
      {
        $or: [
          { email: telecaller.email.toLowerCase() },
          { phone: telecaller.mobileNumber },
          { employeeId: telecaller.userId },
        ],
      },
      { status: "ACTIVE" }
    );

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

// @desc    Activate Telecaller account by SuperAdmin (Pending -> Active) & send login credentials via email
// @route   PATCH /api/v1/superadmin/telecallers/:id/activate or /:telecallerId/activate
// @access  Private (SuperAdmin)
export const activateTelecaller = async (req, res) => {
  try {
    const identifier = req.params.telecallerId || req.params.id;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Telecaller identifier is required',
      });
    }

    const { name, employeeId, email, phone, password } = req.body || {};

    const cleanId = identifier.toString().trim();
    const isObjectId = mongoose.Types.ObjectId.isValid(cleanId);

    // 1. Search in SuperAdminTelecaller
    const superAdminQuery = isObjectId
      ? {
          $or: [
            { _id: cleanId },
            { userId: cleanId },
            { email: cleanId.toLowerCase() },
            { mobileNumber: cleanId },
          ],
          isDeleted: false,
        }
      : {
          $or: [
            { userId: cleanId },
            { email: cleanId.toLowerCase() },
            { mobileNumber: cleanId },
          ],
          isDeleted: false,
        };

    let superAdminTelecaller = await Telecaller.findOne(superAdminQuery);

    // 2. Search in TelecallerAuthModel (telecallers collection)
    const authQuery = isObjectId
      ? {
          $or: [
            { _id: cleanId },
            { employeeId: cleanId },
            { email: cleanId.toLowerCase() },
            { phone: cleanId },
          ],
        }
      : {
          $or: [
            { employeeId: cleanId },
            { email: cleanId.toLowerCase() },
            { phone: cleanId },
          ],
        };

    let authTelecaller = await TelecallerAuthModel.findOne(authQuery);

    // If not found by identifier alone, check if email/phone/employeeId are in req.body
    if (!superAdminTelecaller && !authTelecaller) {
      const fallbackEmail = email ? email.trim().toLowerCase() : null;
      const fallbackPhone = phone ? phone.trim() : null;
      const fallbackEmpId = employeeId ? employeeId.trim().toUpperCase() : null;

      if (fallbackEmail || fallbackPhone || fallbackEmpId) {
        const fallbackSuper = [];
        const fallbackAuth = [];
        if (fallbackEmail) {
          fallbackSuper.push({ email: fallbackEmail });
          fallbackAuth.push({ email: fallbackEmail });
        }
        if (fallbackPhone) {
          fallbackSuper.push({ mobileNumber: fallbackPhone });
          fallbackAuth.push({ phone: fallbackPhone });
        }
        if (fallbackEmpId) {
          fallbackSuper.push({ userId: fallbackEmpId });
          fallbackAuth.push({ employeeId: fallbackEmpId });
        }

        if (fallbackSuper.length > 0) {
          superAdminTelecaller = await Telecaller.findOne({ $or: fallbackSuper, isDeleted: false });
        }
        if (fallbackAuth.length > 0) {
          authTelecaller = await TelecallerAuthModel.findOne({ $or: fallbackAuth });
        }
      }
    }

    if (!superAdminTelecaller && !authTelecaller) {
      return res.status(404).json({
        success: false,
        message: 'Telecaller account not found',
      });
    }

    // Cross-link models if only one was found
    if (superAdminTelecaller && !authTelecaller) {
      authTelecaller = await TelecallerAuthModel.findOne({
        $or: [
          { email: superAdminTelecaller.email?.toLowerCase() },
          { phone: superAdminTelecaller.mobileNumber },
          { employeeId: superAdminTelecaller.userId },
        ],
      });
    }

    if (authTelecaller && !superAdminTelecaller) {
      superAdminTelecaller = await Telecaller.findOne({
        $or: [
          { email: authTelecaller.email?.toLowerCase() },
          { mobileNumber: authTelecaller.phone },
          { userId: authTelecaller.employeeId },
        ],
        isDeleted: false,
      });
    }

    // Harmonize common data
    const resolvedName = (name && name.trim()) || superAdminTelecaller?.fullName || authTelecaller?.name || 'Telecaller';
    const resolvedEmail = (email && email.trim().toLowerCase()) || superAdminTelecaller?.email?.toLowerCase() || authTelecaller?.email?.toLowerCase();
    const resolvedPhone = (phone && phone.trim()) || superAdminTelecaller?.mobileNumber || authTelecaller?.phone || '';
    const resolvedEmployeeId = (employeeId && employeeId.trim().toUpperCase()) || superAdminTelecaller?.userId || authTelecaller?.employeeId || (await generateTelecallerId());

    if (!resolvedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Telecaller cannot be activated because no email address is available.',
      });
    }

    // Password resolution
    const rawPassword = (password && password.trim()) || generateRandomPassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Sync or update SuperAdminTelecaller
    if (!superAdminTelecaller) {
      superAdminTelecaller = await Telecaller.create({
        userId: resolvedEmployeeId,
        fullName: resolvedName,
        mobileNumber: resolvedPhone,
        email: resolvedEmail,
        password: hashedPassword,
        status: 'Active',
        assignedRegion: '',
        createdBy: req.superAdmin?._id || null,
        updatedBy: req.superAdmin?._id || null,
      });
    } else {
      superAdminTelecaller.status = 'Active';
      superAdminTelecaller.fullName = resolvedName;
      superAdminTelecaller.email = resolvedEmail;
      if (resolvedPhone) superAdminTelecaller.mobileNumber = resolvedPhone;
      superAdminTelecaller.password = hashedPassword;
      superAdminTelecaller.updatedBy = req.superAdmin?._id || null;
      await superAdminTelecaller.save();
    }

    // Sync or update TelecallerAuthModel
    if (!authTelecaller) {
      authTelecaller = await TelecallerAuthModel.create({
        name: resolvedName,
        employeeId: resolvedEmployeeId,
        email: resolvedEmail,
        phone: resolvedPhone,
        password: hashedPassword,
        role: 'TELECALLER',
        status: 'ACTIVE',
        createdByVendor: null,
      });
    } else {
      authTelecaller.name = resolvedName;
      authTelecaller.email = resolvedEmail;
      if (resolvedPhone) authTelecaller.phone = resolvedPhone;
      authTelecaller.status = 'ACTIVE';
      authTelecaller.password = hashedPassword;
      await authTelecaller.save();
    }

    // Dispatch credentials email
    let emailSent = false;
    let emailError = null;

    try {
      const emailResult = await sendTelecallerCredentialsEmail({
        toEmail: resolvedEmail,
        telecallerName: resolvedName,
        telecallerId: resolvedEmployeeId,
        password: rawPassword,
      });

      if (emailResult.success) {
        emailSent = true;
      } else {
        emailError = emailResult.error || 'Failed to dispatch email';
      }
    } catch (mailErr) {
      emailError = mailErr.message;
    }

    // Audit Log (Updater identity: SUPER_ADMIN)
    await createAuditLog({
      user: req.superAdmin?.adminId || 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      actorType: 'SUPER_ADMIN',
      action: 'Activated Telecaller',
      record: resolvedEmployeeId,
      module: 'Telecaller Management',
      message: `Telecaller ${resolvedEmployeeId} (${resolvedName}) activated by Super Admin: ${req.superAdmin?.name || 'Super Admin'} (${req.superAdmin?.adminId || 'SUPER'}). Status set to Active in both schemas and credentials dispatched.`,
    });

    return res.status(200).json({
      success: true,
      message: emailSent
        ? 'Telecaller activated and login credentials sent successfully via email.'
        : 'Telecaller activated, but credentials email could not be sent.',
      data: {
        telecallerId: resolvedEmployeeId,
        email: resolvedEmail,
        status: 'Active',
        emailSent,
        ...(emailError && { emailError }),
        telecaller: {
          _id: superAdminTelecaller._id,
          authId: authTelecaller._id,
          userId: resolvedEmployeeId,
          fullName: resolvedName,
          email: resolvedEmail,
          mobileNumber: resolvedPhone,
          status: 'Active',
        },
      },
    });
  } catch (error) {
    console.error('Activate telecaller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to activate telecaller',
      error: error.message,
    });
  }
};
