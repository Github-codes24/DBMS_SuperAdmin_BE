import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from './userSchema.js';
import Telecaller from '../TelecallerManagement/telecallerSchema.js';
import { createAuditLog } from '../../utils/auditLogger.js';

// Regex patterns for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-\s]{10,15}$/;

// Helper function to generate custom auto-increment user ID based on role
const generateUserId = async (role) => {
  if (role === 'TELECALLER') {
    const existingTelecallers = await Telecaller.find({}).select('userId');
    let maxNum = 0;
    existingTelecallers.forEach((tc) => {
      if (tc.userId) {
        const num = parseInt(tc.userId.replace(/^TC/i, ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    const nextNum = maxNum > 0 ? maxNum + 1 : 1;
    return `TC${nextNum.toString().padStart(3, '0')}`;
  }

  const prefix = 'ADM';
  const lastUser = await User.findOne({ userId: new RegExp(`^${prefix}`) })
    .sort({ createdAt: -1 })
    .exec();

  let nextNumber = 1;
  if (lastUser && lastUser.userId) {
    const numericPart = parseInt(lastUser.userId.replace(prefix, ''), 10);
    if (!isNaN(numericPart)) {
      nextNumber = numericPart + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
};

// Sensitive fields string to exclude from query results
const EXCLUDE_SENSITIVE_FIELDS = '-password -refreshToken -otp -otpExpireAt -isOtpVerified';


// CREATE USER API
// @desc    Create a new User (ADMIN in users collection, TELECALLER in superadmintelecallers collection)
// @route   POST /api/v1/users/
// @access  Private (SUPER_ADMIN or ADMIN Required)
export const createUser = async (req, res) => {
  const {
    fullName,
    email,
    phone,
    password,
    role,
    status = 'ACTIVE',
    permissions = [],
    target = 0,
    assignedLeads = [],
    assignedRegion = '',
  } = req.body;

  try {
    // 1. Mandatory Fields Validation
    if (!fullName || !email || !phone || !role) {
      return res.status(400).json({
        message: 'Please provide all required fields: fullName, email, phone, and role',
      });
    }

    // 2. Format & Value Validations
    if (fullName.trim().length < 2) {
      return res.status(400).json({
        message: 'Full name must be at least 2 characters long',
      });
    }

    const formattedEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(formattedEmail)) {
      return res.status(400).json({
        message: 'Please provide a valid email address (e.g. user@example.com)',
      });
    }

    const formattedPhone = phone.trim();
    if (!PHONE_REGEX.test(formattedPhone)) {
      return res.status(400).json({
        message: 'Please provide a valid phone number (10 to 15 digits)',
      });
    }

    if (role === 'TELECALLER') {
      if (!password || password.length < 6) {
        return res.status(400).json({
          message: 'Password is required for TELECALLER role and must be at least 6 characters long',
        });
      }
    } else if (password && password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long',
      });
    }

    const allowedRoles = ['ADMIN', 'TELECALLER'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: `Invalid role specified. Allowed roles are: ${allowedRoles.join(', ')}`,
      });
    }

    const allowedStatuses = ['ACTIVE', 'INACTIVE', 'BLOCKED', 'Active', 'Disabled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status specified. Allowed statuses are: ${allowedStatuses.join(', ')}`,
      });
    }

    let rawRole = (req.user?.role || req.superAdmin?.role || 'SUPER_ADMIN').toUpperCase();
    if (rawRole === 'SUPERADMIN') rawRole = 'SUPER_ADMIN';
    const creatorRole = rawRole;

    // 3. Role Access Rules Check
    if (role === 'SUPER_ADMIN') {
      return res.status(403).json({
        message: 'Cannot create a SUPER_ADMIN through this endpoint',
      });
    }

    if (creatorRole === 'ADMIN' && role !== 'TELECALLER') {
      return res.status(403).json({
        message: 'ADMIN can only create TELECALLER users',
      });
    }

    if (creatorRole !== 'SUPER_ADMIN' && creatorRole !== 'ADMIN') {
      return res.status(403).json({
        message: 'Only SUPER_ADMIN and ADMIN are allowed to create users',
      });
    }

    // 4. Uniqueness Check across both User and Telecaller collections
    const [existingUserEmail, existingTcEmail] = await Promise.all([
      User.findOne({ email: formattedEmail, isDeleted: false }),
      Telecaller.findOne({ email: formattedEmail, isDeleted: false }),
    ]);
    if (existingUserEmail || existingTcEmail) {
      return res.status(400).json({
        message: 'User with this email already exists',
      });
    }

    const cleanDigits = (p) => p.toString().replace(/[\s\-\(\)\.\+]/g, '');
    const targetDigits = cleanDigits(formattedPhone);

    const [allUsers, allTcs] = await Promise.all([
      User.find({ isDeleted: false }).select('phone'),
      Telecaller.find({ isDeleted: false }).select('mobileNumber'),
    ]);

    const existingUserPhone = allUsers.some((u) => u.phone && cleanDigits(u.phone) === targetDigits);
    const existingTcPhone = allTcs.some((tc) => tc.mobileNumber && cleanDigits(tc.mobileNumber) === targetDigits);

    if (existingUserPhone || existingTcPhone) {
      return res.status(400).json({
        message: 'User with this phone number already exists',
      });
    }

    // 5. Generate custom User ID (ADM001, TC001, etc.)
    const userId = await generateUserId(role);

    let createdUserDoc;

    if (role === 'TELECALLER') {
      // Create directly in superadmintelecallers collection
      const newTc = await Telecaller.create({
        userId,
        fullName: fullName.trim(),
        mobileNumber: formattedPhone,
        email: formattedEmail,
        password: password.trim(),
        assignedRegion: assignedRegion.trim(),
        status: status.toUpperCase() === 'ACTIVE' || status === 'Active' ? 'Active' : 'Disabled',
        createdBy: req.superAdmin?._id || req.user?._id,
      });

      const tcObj = newTc.toObject();
      delete tcObj.password;
      createdUserDoc = {
        ...tcObj,
        phone: tcObj.mobileNumber,
        role: 'TELECALLER',
        status: tcObj.status.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
      };
    } else {
      // Create in users collection for ADMIN
      let hashedPassword = '';
      if (password) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(password, salt);
      }

      const user = await User.create({
        userId,
        fullName: fullName.trim(),
        email: formattedEmail,
        phone: formattedPhone,
        password: hashedPassword,
        role,
        status: status.toUpperCase(),
        permissions,
        target,
        assignedLeads,
        createdBy: req.superAdmin?._id || req.user?._id,
      });

      const userObj = user.toObject();
      delete userObj.password;
      delete userObj.otp;
      delete userObj.refreshToken;
      createdUserDoc = userObj;
    }

    res.status(201).json({
      message: 'User created successfully',
      user: createdUserDoc,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// GET ALL USERS
// @desc    Returns combined users (Admins from users collection & Telecallers from superadmintelecallers collection)
// @route   GET /api/v1/users/
// @access  Private (JWT Required)
export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { search, role, status, sort, sortBy } = req.query;

    const filterRole = role ? role.trim().toUpperCase() : null;
    const filterStatus = status ? status.trim().toUpperCase() : null;

    let combinedList = [];

    // Fetch from users collection if role is not TELECALLER
    if (!filterRole || filterRole === 'ADMIN' || filterRole === 'SUPER_ADMIN') {
      const uQuery = { isDeleted: false };
      if (filterRole) uQuery.role = filterRole;
      if (filterStatus) uQuery.status = filterStatus;
      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        uQuery.$or = [{ fullName: searchRegex }, { email: searchRegex }, { phone: searchRegex }];
      }
      const adminUsers = await User.find(uQuery).select(EXCLUDE_SENSITIVE_FIELDS).lean();
      combinedList.push(...adminUsers);
    }

    // Fetch from superadmintelecallers collection if role is not ADMIN/SUPER_ADMIN
    if (!filterRole || filterRole === 'TELECALLER') {
      const tcQuery = { isDeleted: false };
      if (filterStatus) {
        tcQuery.status = filterStatus === 'ACTIVE' ? { $in: ['Active', 'ACTIVE'] } : { $in: ['Disabled', 'DISABLED', 'INACTIVE'] };
      }
      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        tcQuery.$or = [{ fullName: searchRegex }, { email: searchRegex }, { mobileNumber: searchRegex }, { userId: searchRegex }];
      }
      const telecallers = await Telecaller.find(tcQuery).lean();
      const formattedTcs = telecallers.map((tc) => ({
        ...tc,
        phone: tc.mobileNumber,
        role: 'TELECALLER',
        status: (tc.status || '').toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
      }));
      combinedList.push(...formattedTcs);
    }

    // Sort combined results by createdAt descending (or ascending)
    const sortOrder = (sort || sortBy || '').toLowerCase();
    combinedList.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return sortOrder === 'asc' || sortOrder === '1' ? dateA - dateB : dateB - dateA;
    });

    const totalUsers = combinedList.length;
    const paginatedUsers = combinedList.slice(skip, skip + limit);

    res.json({
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit) || 1,
      currentPage: page,
      limit,
      users: paginatedUsers,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// GET USER BY ID
// @desc    Returns a user by MongoDB ID from users or superadmintelecallers collection
// @route   GET /api/v1/users/:userId
// @access  Private (JWT Required)
export const getUserById = async (req, res) => {
  const { userId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid MongoDB User ID format' });
    }

    let user = await User.findOne({ _id: userId, isDeleted: false }).select(EXCLUDE_SENSITIVE_FIELDS).lean();

    if (!user) {
      const tc = await Telecaller.findOne({ _id: userId, isDeleted: false }).lean();
      if (tc) {
        delete tc.password;
        user = {
          ...tc,
          phone: tc.mobileNumber,
          role: 'TELECALLER',
          status: (tc.status || '').toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        };
      }
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// UPDATE USER
// @desc    Updates an existing user/telecaller subject to role-based restrictions
// @route   PATCH /api/v1/users/:userId
// @access  Private (JWT + Role Rules Required)
export const updateUser = async (req, res) => {
  const { userId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid MongoDB User ID format' });
    }

    let rawRole = (req.user?.role || req.superAdmin?.role || 'SUPER_ADMIN').toUpperCase();
    if (rawRole === 'SUPERADMIN') rawRole = 'SUPER_ADMIN';
    const creatorRole = rawRole;
    const creatorId = (req.user?._id || req.superAdmin?._id)?.toString();

    if (creatorRole === 'TELECALLER') {
      return res.status(403).json({ message: 'TELECALLER is not authorized to update users' });
    }

    // Try finding in User collection first, then Telecaller collection
    let user = await User.findOne({ _id: userId, isDeleted: false });
    let isTelecallerDoc = false;

    if (!user) {
      user = await Telecaller.findOne({ _id: userId, isDeleted: false });
      if (user) isTelecallerDoc = true;
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (creatorRole === 'ADMIN' && user.role === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'ADMIN cannot update a SUPER_ADMIN' });
    }

    const {
      fullName,
      email,
      phone,
      mobileNumber,
      password,
      role,
      status,
      permissions,
      target,
      assignedLeads,
      assignedRegion,
    } = req.body;

    if (role === 'SUPER_ADMIN' && creatorRole === 'ADMIN') {
      return res.status(403).json({ message: 'ADMIN cannot assign SUPER_ADMIN role' });
    }

    if (creatorId && creatorId === user._id.toString() && role && role !== user.role) {
      return res.status(403).json({ message: 'A user cannot change their own role' });
    }

    if (fullName && fullName.trim().length >= 2) {
      user.fullName = fullName.trim();
    }

    const updatedEmail = email ? email.toLowerCase().trim() : null;
    if (updatedEmail) {
      const [exU, exTC] = await Promise.all([
        User.findOne({ email: updatedEmail, isDeleted: false, _id: { $ne: userId } }),
        Telecaller.findOne({ email: updatedEmail, isDeleted: false, _id: { $ne: userId } }),
      ]);
      if (exU || exTC) {
        return res.status(400).json({ message: 'Email address is already in use by another user' });
      }
      user.email = updatedEmail;
    }

    const updatedPhone = (phone || mobileNumber || '').trim();
    if (updatedPhone) {
      const cleanDigits = (p) => p.toString().replace(/[\s\-\(\)\.\+]/g, '');
      const targetDigits = cleanDigits(updatedPhone);

      const [allUsers, allTcs] = await Promise.all([
        User.find({ isDeleted: false, _id: { $ne: userId } }).select('phone'),
        Telecaller.find({ isDeleted: false, _id: { $ne: userId } }).select('mobileNumber'),
      ]);

      const existingUserPhone = allUsers.some((u) => u.phone && cleanDigits(u.phone) === targetDigits);
      const existingTcPhone = allTcs.some((tc) => tc.mobileNumber && cleanDigits(tc.mobileNumber) === targetDigits);

      if (existingUserPhone || existingTcPhone) {
        return res.status(400).json({ message: 'Phone number is already in use by another user' });
      }

      user.phone = updatedPhone;
      if (isTelecallerDoc) user.mobileNumber = updatedPhone;
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }
      if (isTelecallerDoc) {
        user.password = password.trim();
      } else {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
      }
    }

    if (status) {
      if (isTelecallerDoc) {
        user.status = status.toUpperCase() === 'ACTIVE' || status === 'Active' ? 'Active' : 'Disabled';
      } else {
        user.status = status.toUpperCase();
      }
    }

    if (isTelecallerDoc && assignedRegion !== undefined) {
      user.assignedRegion = assignedRegion.trim();
    }

    if (!isTelecallerDoc) {
      if (permissions !== undefined) user.permissions = permissions;
      if (target !== undefined) user.target = target;
      if (assignedLeads !== undefined) user.assignedLeads = assignedLeads;
    }

    user.updatedBy = req.superAdmin?._id || req.user?._id;
    await user.save();

    await createAuditLog({
      user: 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      action: status === 'BLOCKED' || status === 'INACTIVE' || status === 'Disabled' ? 'Disabled User' : 'Updated User',
      record: user.userId || user._id.toString(),
      module: 'User Management',
    });

    const updatedUserObj = user.toObject();
    delete updatedUserObj.password;

    res.json({
      message: 'User updated successfully',
      user: isTelecallerDoc
        ? { ...updatedUserObj, phone: updatedUserObj.mobileNumber, role: 'TELECALLER' }
        : updatedUserObj,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// DELETE USER (SOFT-DELETE)
// @desc    Soft-deletes a user from users or superadmintelecallers collection
// @route   DELETE /api/v1/users/:userId
// @access  Private (JWT + Role Rules Required)
export const deleteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid MongoDB User ID format' });
    }

    let rawRole = (req.user?.role || req.superAdmin?.role || 'SUPER_ADMIN').toUpperCase();
    if (rawRole === 'SUPERADMIN') rawRole = 'SUPER_ADMIN';
    const creatorRole = rawRole;
    const creatorId = (req.user?._id || req.superAdmin?._id)?.toString();

    if (creatorRole === 'TELECALLER') {
      return res.status(403).json({ message: 'TELECALLER is not authorized to delete users' });
    }

    let user = await User.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      user = await Telecaller.findOne({ _id: userId, isDeleted: false });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (creatorRole === 'ADMIN' && user.role === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'ADMIN cannot delete a SUPER_ADMIN' });
    }

    if (creatorId && creatorId === user._id.toString()) {
      return res.status(403).json({ message: 'A user cannot delete their own account' });
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = req.superAdmin?._id || req.user?._id;
    user.updatedBy = req.superAdmin?._id || req.user?._id;

    await user.save();

    res.json({ message: 'User soft-deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

