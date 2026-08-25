import bcrypt from "bcryptjs";
import Telecaller from "../models/Telecaller.js";
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

// ─── SIGNUP ───────────────────────────────────────────────────────────────────

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
    throw new Error("Telecaller already exists");
  }

  const telecaller = await Telecaller.create({
    name,
    employeeId,
    email,
    phone,
    password,
  });

  const token = generateToken(telecaller._id);

  return {
    token,
    telecaller: toPublicProfile(telecaller),
  };
};

// ─── LOGIN WITH EMAIL + PASSWORD ─────────────────────────────────────────────

export const login = async ({ email, password }) => {
  const telecaller = await Telecaller.findOne({
    email: email.toLowerCase(),
  }).select("+password");

  if (!telecaller) {
    throw new Error("Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    telecaller.password
  );

  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
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