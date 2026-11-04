import bcrypt from "bcryptjs";
import Telecaller from "../models/Telecaller.js";
import SuperAdminTelecaller from "../../SuperadminPanel/TelecallerManagement/telecallerSchema.js";
import generateToken from "../utils/generateTelecallerToken.js";

const toPublicProfile = (user) => ({
  _id: user._id,
  name: user.name || user.fullName,
  employeeId: user.employeeId || user.userId,
  email: user.email,
  phone: user.phone || user.mobileNumber,
  role: user.role || "TELECALLER",
  status: user.status,
  profileImage: user.profileImage || "",
  lastLogin: user.lastLogin || null,
});

// ─── SIGNUP (Internal helper, public signup disabled) ─────────────────────────

export const signup = async ({
  name,
  employeeId,
  email,
  phone,
  password,
}) => {
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanPhone = (phone || '').trim();
  const cleanEmpId = (employeeId || '').toUpperCase().trim();

  // 1. Check specific field collision in Telecaller auth collection
  const existingEmail = await Telecaller.findOne({ email: cleanEmail });
  if (existingEmail) {
    const err = new Error(`Telecaller with email '${email}' already exists`);
    err.statusCode = 409;
    throw err;
  }

  const existingPhone = await Telecaller.findOne({ phone: cleanPhone });
  if (existingPhone) {
    const err = new Error(`Telecaller with phone number '${phone}' already exists`);
    err.statusCode = 409;
    throw err;
  }

  const existingEmpId = await Telecaller.findOne({ employeeId: cleanEmpId });
  if (existingEmpId) {
    const err = new Error(`Telecaller with employeeId '${employeeId}' already exists`);
    err.statusCode = 409;
    throw err;
  }

  // 2. Check collision in SuperAdminTelecaller master directory
  const existingMaster = await SuperAdminTelecaller.findOne({
    $or: [
      { email: cleanEmail },
      { mobileNumber: cleanPhone },
      { userId: cleanEmpId },
    ],
    isDeleted: false,
  });
  if (existingMaster) {
    let conflictField = "records";
    if (existingMaster.email === cleanEmail) conflictField = `email '${email}'`;
    else if (existingMaster.mobileNumber === cleanPhone) conflictField = `phone number '${phone}'`;
    else if (existingMaster.userId === cleanEmpId) conflictField = `employee ID '${employeeId}'`;
    const err = new Error(`Telecaller with ${conflictField} already exists in Super Admin records`);
    err.statusCode = 409;
    throw err;
  }

  // 3. Create telecaller with PENDING status (activation by Super Admin required)
  const telecaller = await Telecaller.create({
    name,
    employeeId: cleanEmpId,
    email: cleanEmail,
    phone: cleanPhone,
    password,
    role: "TELECALLER",
    status: "PENDING",
  });

  // 4. Also register in SuperAdminTelecaller directory with Pending status
  await SuperAdminTelecaller.findOneAndUpdate(
    { email: cleanEmail },
    {
      userId: cleanEmpId,
      fullName: name,
      mobileNumber: cleanPhone,
      email: cleanEmail,
      password,
      status: "Pending",
      isDeleted: false,
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  return {
    message: "Telecaller registered successfully. Your account is pending activation by Super Admin.",
    telecaller: toPublicProfile(telecaller),
  };
};

// ─── LOGIN WITH EMAIL + PASSWORD ─────────────────────────────────────────────
// Enforces active status in both Telecaller and SuperAdminTelecaller schemas

export const login = async ({ email, password }) => {
  const cleanEmail = (email || '').toLowerCase().trim();
  const inputIdentifier = (email || '').trim();

  // 1. Search in Telecaller auth collection
  let telecaller = await Telecaller.findOne({
    $or: [
      { email: cleanEmail },
      { employeeId: inputIdentifier.toUpperCase() },
    ],
  }).select("+password");

  // 2. Also check SuperAdminTelecaller master directory
  const superAdminTc = await SuperAdminTelecaller.findOne({
    $or: [
      { email: cleanEmail },
      { userId: inputIdentifier.toUpperCase() },
      { mobileNumber: inputIdentifier },
    ],
    isDeleted: false,
  }).select("+password");

  // If not found in either
  if (!telecaller && !superAdminTc) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  // Determine authorities and statuses
  const rawStatus = (superAdminTc?.status || telecaller?.status || '').toUpperCase();
  const isPending = rawStatus === 'PENDING' || rawStatus === 'INACTIVE';
  const isBlocked = rawStatus === 'BLOCKED' || rawStatus === 'DISABLED';

  // Check fallback messages before granting access
  if (isPending) {
    const err = new Error("Your account is pending activation by Super Admin. Please wait for activation and login credentials via email.");
    err.statusCode = 403;
    throw err;
  }

  if (isBlocked) {
    const err = new Error("Your account has been blocked or disabled by Super Admin. Please contact support.");
    err.statusCode = 403;
    throw err;
  }

  // Verify password against whichever record has password
  let isPasswordValid = false;

  if (telecaller && telecaller.password) {
    isPasswordValid = await bcrypt.compare(password, telecaller.password);
  }

  if (!isPasswordValid && superAdminTc && superAdminTc.password) {
    isPasswordValid = await bcrypt.compare(password, superAdminTc.password);
  }

  if (!isPasswordValid) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  // If active in SuperAdminTelecaller but not yet in Telecaller auth model, sync now
  if (!telecaller && superAdminTc) {
    telecaller = await Telecaller.create({
      name: superAdminTc.fullName,
      employeeId: superAdminTc.userId,
      email: superAdminTc.email.toLowerCase(),
      phone: superAdminTc.mobileNumber,
      password: superAdminTc.password,
      role: 'TELECALLER',
      status: 'ACTIVE',
    });
  }

  if (telecaller) {
    telecaller.lastLogin = new Date();
    await telecaller.save();
  }

  const token = generateToken(telecaller ? telecaller._id : superAdminTc._id);

  return {
    token,
    telecaller: toPublicProfile(telecaller || superAdminTc),
  };
};

export const getMe = (telecaller) => {
  return toPublicProfile(telecaller);
};
