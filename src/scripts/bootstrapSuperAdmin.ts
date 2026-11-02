import "dotenv/config";
import mongoose from "mongoose";

import { User } from "../models/User.js";
import { hashPassword } from "../utils/password.js";

async function bootstrapSuperAdmin(): Promise<void> {
  console.log("Starting Super Admin bootstrap...");

  const mongoUri = process.env.MONGODB_URI;

  const name = process.env.SUPERADMIN_NAME;
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!name || !email || !password) {
    throw new Error(
      "SUPERADMIN_NAME, SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be configured",
    );
  }

  if (password.length < 12) {
    throw new Error(
      "SUPERADMIN_PASSWORD must contain at least 12 characters",
    );
  }

  console.log("Connecting to MongoDB...");

  await mongoose.connect(mongoUri);

  console.log("MongoDB connected");

  const existingSuperAdmin = await User.findOne({
    role: "superadmin",
  });

  if (existingSuperAdmin) {
    console.log("A Super Admin already exists.");
    console.log("Bootstrap cancelled.");
    return;
  }

  const existingEmail = await User.findOne({ email });

  if (existingEmail) {
    throw new Error(
      `A user with email ${email} already exists but is not a Super Admin.`,
    );
  }

  console.log("Creating Super Admin...");

  const passwordHash = await hashPassword(password);

  const user = await User.create({
    name,
    email,
    passwordHash,
    role: "superadmin",
    // projectIds: [],
    isActive: true,
  });

  console.log("");
  console.log("=================================");
  console.log("Super Admin created successfully");
  console.log("=================================");
  console.log(`ID:    ${user._id}`);
  console.log(`Name:  ${user.name}`);
  console.log(`Email: ${user.email}`);
  console.log("Role:  superadmin");
  console.log("=================================");
}

bootstrapSuperAdmin()
  .catch((error: unknown) => {
    console.error("Bootstrap failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });