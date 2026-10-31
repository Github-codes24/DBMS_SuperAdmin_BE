import bcrypt from "bcryptjs";
import Telecaller from "../models/Telecaller.js";
import SuperAdminTelecaller from "../../SuperadminPanel/TelecallerManagement/telecallerSchema.js";
import generateToken from "../utils/generateTelecallerToken.js";

const toPublicProfile = (user) => ({
  _id: user._id,
  name: user.name,
  employeeId: user.employeeId,
  email: user.email,
  phone: user.phone,
  role: user.role,
  status: user.status,
  profileImage: user.profileImage,
  lastLogin: user.lastLogin,
});

// ─── SIGNUP (Internal helper, public signup disabled) ─────────────────────────

export const signup = async ({
  name,
  employeeId,
  email,
  phone,
  password,
}) => {
  const exists = await Telecaller.findOne({
    $or: [
      { email: email.toLowerCase() },
      { phone },
      { employeeId: employeeId.toUpperCase() },
    ],
  });

  if (exists) {
    const err = new Error("Telecaller already exists");
    err.statusCode = 400;
    throw err;
  }

  const telecaller = await Telecaller.create({
    name,
    employeeId,
    email,
    phone,
    password,
    status: "PENDING",
  });

  const token = generateToken(telecaller._id);

  return {
    token,
    telecaller: toPublicProfile(telecaller),
  };
};

// ─── LOGIN WITH EMAIL + PASSWORD ─────────────────────────────────────────────
// Enforces active status in both Telecaller and SuperAdminTelecaller schemas

export const login = async ({ email, password }) => {
  const cleanEmail = email.toLowerCase().trim();

  // 1. Find telecaller in Telecaller auth collection (telecallers)
  const telecaller = await Telecaller.findOne({
    email: cleanEmail,
  }).select("+password");

  if (!telecaller) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  // 2. Find telecaller in SuperAdminTelecaller collection (superadmintelecallers)
  const superAdminTc = await SuperAdminTelecaller.findOne({
    $or: [
      { email: cleanEmail },
      { mobileNumber: telecaller.phone },
      { userId: telecaller.employeeId },
    ],
    isDeleted: false,
  }).select("+password");

  // 3. Verify password
  const isPasswordValid = await bcrypt.compare(
    password,
    telecaller.password
  );

  if (!isPasswordValid) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  // 4. CHECK STATUS IN BOTH SCHEMAS: Telecaller cannot log in until Active in BOTH
  const authStatus = (telecaller.status || "").toUpperCase();
  const superStatus = superAdminTc ? (superAdminTc.status || "").toUpperCase() : null;

  // Check if blocked in EITHER schema
  if (authStatus === "BLOCKED" || superStatus === "BLOCKED") {
    const err = new Error("Your account has been blocked by Super Admin.");
    err.statusCode = 403;
    throw err;
  }

  // Check if pending in EITHER schema
  if (authStatus === "PENDING" || superStatus === "PENDING") {
    const err = new Error("Your account is pending activation by Super Admin. Please wait for Super Admin approval.");
    err.statusCode = 403;
    throw err;
  }

  // Ensure active in BOTH schemas
  const isAuthActive = authStatus === "ACTIVE";
  const isSuperActive = !superAdminTc || superStatus === "ACTIVE";

  if (!isAuthActive || !isSuperActive) {
    const err = new Error("Your account is not active. Please contact Super Admin.");
    err.statusCode = 403;
    throw err;
  }

  telecaller.lastLogin = new Date();
  await telecaller.save();

  const token = generateToken(telecaller._id);

  return {
    token,
    telecaller: toPublicProfile(telecaller),
  };
};

export const getMe = (telecaller) => {
  return toPublicProfile(telecaller);
};

export const changePassword = async (telecaller, oldPassword, newPassword) => {
  const tc = await Telecaller.findById(telecaller._id).select("+password");
  if (!tc) {
    const err = new Error("Telecaller not found");
    err.statusCode = 404;
    throw err;
  }

  const isMatch = await bcrypt.compare(oldPassword, tc.password);
  if (!isMatch) {
    const err = new Error("Incorrect current password");
    err.statusCode = 400;
    throw err;
  }

  tc.password = newPassword;
  await tc.save();
  return true;
};
