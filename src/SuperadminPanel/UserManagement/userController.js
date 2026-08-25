import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from './userSchema.js';

// Regex patterns for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-\s]{10,15}$/;

// Helper function to generate custom auto-increment user ID based on role
const generateUserId = async (role) => {
  const prefix = role === 'ADMIN' ? 'ADM' : 'TC';
  
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


//CREATE USER API
// @desc    Create a new User
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
  } = req.body;

  try {
    // 1. Mandatory Fields Validation
    if (!fullName || !email || !phone || !password || !role) {
      return res.status(400).json({
        message: 'Please provide all required fields: fullName, email, phone, password, and role',
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

    if (password.length < 6) {
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

    const allowedStatuses = ['ACTIVE', 'INACTIVE', 'BLOCKED'];
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

    // 4. Uniqueness Check among non-deleted users (isDeleted: false)
    const existingEmail = await User.findOne({
      email: formattedEmail,
      isDeleted: false,
    });
    if (existingEmail) {
      return res.status(400).json({
        message: 'User with this email already exists',
      });
    }

    const existingPhone = await User.findOne({
      phone: formattedPhone,
      isDeleted: false,
    });
    if (existingPhone) {
      return res.status(400).json({
        message: 'User with this phone number already exists',
      });
    }

    // 5. Generate custom User ID (ADM001, TC001, etc.)
    const userId = await generateUserId(role);

    // 6. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 7. Create User Document
    const user = await User.create({
      userId,
      fullName: fullName.trim(),
      email: formattedEmail,
      phone: formattedPhone,
      password: hashedPassword,
      role,
      status,
      permissions,
      target,
      assignedLeads,
      createdBy: req.superAdmin._id,
    });

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.otp;
    delete userResponse.refreshToken;

    res.status(201).json({
      message: 'User created successfully',
      user: userResponse,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


//GET ALL USERS
// @desc    Returns users with pagination, search, role/status filters and sorting
// @route   GET /api/v1/users/
// @access  Private (JWT Required)
export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { search, role, status, sort, sortBy } = req.query;

    // Filter non-deleted users
    const query = { isDeleted: false };

    // Search filter (fullName, email, or phone)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    // Role filter
    if (role && role.trim()) {
      query.role = role.trim().toUpperCase();
    }

    // Status filter
    if (status && status.trim()) {
      query.status = status.trim().toUpperCase();
    }

    // Sorting option (createdAt asc / desc)
    let sortOptions = { createdAt: -1 }; // default descending
    const sortOrder = (sort || sortBy || '').toLowerCase();
    if (sortOrder === 'asc' || sortOrder === '1') {
      sortOptions = { createdAt: 1 };
    }

    const totalUsers = await User.countDocuments(query);

    const users = await User.find(query)
      .select(EXCLUDE_SENSITIVE_FIELDS)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .exec();

    res.json({
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
      limit,
      users,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


//GET USER BY ID
// @desc    Returns a user by MongoDB user ID
// @route   GET /api/v1/users/:userId
// @access  Private (JWT Required)
export const getUserById = async (req, res) => {
  const { userId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid MongoDB User ID format' });
    }

    const user = await User.findOne({ _id: userId, isDeleted: false }).select(EXCLUDE_SENSITIVE_FIELDS);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


//UPDATE USER
// @desc    Updates an existing user subject to role-based restrictions
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

    // 1. Role Rule: TELECALLER cannot update users
    if (creatorRole === 'TELECALLER') {
      return res.status(403).json({ message: 'TELECALLER is not authorized to update users' });
    }

    const user = await User.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 2. Role Rule: ADMIN cannot update a SUPER_ADMIN
    if (creatorRole === 'ADMIN' && user.role === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'ADMIN cannot update a SUPER_ADMIN' });
    }

    const {
      fullName,
      email,
      phone,
      password,
      role,
      status,
      permissions,
      target,
      assignedLeads,
    } = req.body;

    // 3. Role Rule: ADMIN cannot assign the SUPER_ADMIN role
    if (role === 'SUPER_ADMIN' && creatorRole === 'ADMIN') {
      return res.status(403).json({ message: 'ADMIN cannot assign SUPER_ADMIN role' });
    }

    // 4. Role Rule: A user cannot change their own role
    if (creatorId && creatorId === user._id.toString() && role && role !== user.role) {
      return res.status(403).json({ message: 'A user cannot change their own role' });
    }

    // 5. Update Validations & Duplication Checks
    if (fullName) {
      if (fullName.trim().length < 2) {
        return res.status(400).json({ message: 'Full name must be at least 2 characters long' });
      }
      user.fullName = fullName.trim();
    }

    if (email) {
      const formattedEmail = email.toLowerCase().trim();
      if (!EMAIL_REGEX.test(formattedEmail)) {
        return res.status(400).json({ message: 'Please provide a valid email address' });
      }
      const existingEmail = await User.findOne({
        email: formattedEmail,
        isDeleted: false,
        _id: { $ne: userId },
      });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email address is already in use by another user' });
      }
      user.email = formattedEmail;
    }

    if (phone) {
      const formattedPhone = phone.trim();
      if (!PHONE_REGEX.test(formattedPhone)) {
        return res.status(400).json({ message: 'Please provide a valid phone number' });
      }
      const existingPhone = await User.findOne({
        phone: formattedPhone,
        isDeleted: false,
        _id: { $ne: userId },
      });
      if (existingPhone) {
        return res.status(400).json({ message: 'Phone number is already in use by another user' });
      }
      user.phone = formattedPhone;
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    if (role) {
      const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'TELECALLER'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role specified' });
      }
      user.role = role;
    }

    if (status) {
      const allowedStatuses = ['ACTIVE', 'INACTIVE', 'BLOCKED'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status specified' });
      }
      user.status = status;
    }

    if (permissions !== undefined) {
      user.permissions = permissions;
    }

    if (target !== undefined) {
      user.target = target;
    }

    if (assignedLeads !== undefined) {
      user.assignedLeads = assignedLeads;
    }

    // Set updatedBy tracking
    user.updatedBy = req.superAdmin._id;

    await user.save();

    const updatedUserResponse = user.toObject();
    delete updatedUserResponse.password;
    delete updatedUserResponse.otp;
    delete updatedUserResponse.refreshToken;

    res.json({
      message: 'User updated successfully',
      user: updatedUserResponse,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// DELETE USER (SOFT-DELETE)
// @desc    Soft-deletes a user subject to role-based restrictions
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

    // 1. Delete Rule: TELECALLER cannot delete users
    if (creatorRole === 'TELECALLER') {
      return res.status(403).json({ message: 'TELECALLER is not authorized to delete users' });
    }

    const user = await User.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 2. Delete Rule: ADMIN cannot delete a SUPER_ADMIN
    if (creatorRole === 'ADMIN' && user.role === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'ADMIN cannot delete a SUPER_ADMIN' });
    }

    // 3. Delete Rule: A user cannot delete their own account
    if (creatorId && creatorId === user._id.toString()) {
      return res.status(403).json({ message: 'A user cannot delete their own account' });
    }

    // 4. Perform Soft Delete
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = req.superAdmin._id;
    user.updatedBy = req.superAdmin._id;

    await user.save();

    res.json({ message: 'User soft-deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
