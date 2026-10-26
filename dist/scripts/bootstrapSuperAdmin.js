"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = __importDefault(require("mongoose"));
const User_js_1 = require("../models/User.js");
const password_js_1 = require("../utils/password.js");
async function bootstrapSuperAdmin() {
    console.log("Starting Super Admin bootstrap...");
    const mongoUri = process.env.MONGODB_URI;
    const name = process.env.SUPERADMIN_NAME;
    const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SUPERADMIN_PASSWORD;
    if (!mongoUri) {
        throw new Error("MONGODB_URI is not configured");
    }
    if (!name || !email || !password) {
        throw new Error("SUPERADMIN_NAME, SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be configured");
    }
    if (password.length < 12) {
        throw new Error("SUPERADMIN_PASSWORD must contain at least 12 characters");
    }
    console.log("Connecting to MongoDB...");
    await mongoose_1.default.connect(mongoUri);
    console.log("MongoDB connected");
    const existingSuperAdmin = await User_js_1.User.findOne({
        role: "superadmin",
    });
    if (existingSuperAdmin) {
        console.log("A Super Admin already exists.");
        console.log("Bootstrap cancelled.");
        return;
    }
    const existingEmail = await User_js_1.User.findOne({ email });
    if (existingEmail) {
        throw new Error(`A user with email ${email} already exists but is not a Super Admin.`);
    }
    console.log("Creating Super Admin...");
    const passwordHash = await (0, password_js_1.hashPassword)(password);
    const user = await User_js_1.User.create({
        name,
        email,
        passwordHash,
        role: "superadmin",
        projectIds: [],
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
    .catch((error) => {
    console.error("Bootstrap failed:", error);
    process.exitCode = 1;
})
    .finally(async () => {
    await mongoose_1.default.disconnect();
});
//# sourceMappingURL=bootstrapSuperAdmin.js.map