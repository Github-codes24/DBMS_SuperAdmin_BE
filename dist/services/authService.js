"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthServiceError = void 0;
exports.loginUser = loginUser;
exports.getAdminProfile = getAdminProfile;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_js_1 = require("../models/User.js");
const password_js_1 = require("../utils/password.js");
class AuthServiceError extends Error {
    statusCode;
    code;
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = "AuthServiceError";
    }
}
exports.AuthServiceError = AuthServiceError;
async function loginUser(email, password) {
    const user = await User_js_1.User.findOne({ email }).select("+passwordHash");
    // Use the same response for an unknown email and an incorrect password.
    if (!user) {
        throw new AuthServiceError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }
    const passwordMatches = await (0, password_js_1.verifyPassword)(password, user.passwordHash);
    if (!passwordMatches || !user.isActive) {
        throw new AuthServiceError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error("JWT_ACCESS_SECRET must be configured with at least 32 characters");
    }
    const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
    const tokenOptions = {
        subject: user._id.toString(),
        expiresIn: expiresIn,
        issuer: "dbms-superadmin-api",
        audience: "dbms-superadmin",
    };
    const accessToken = jsonwebtoken_1.default.sign({
        role: user.role,
        projectIds: user.projectIds,
    }, secret, tokenOptions);
    user.lastLoginAt = new Date();
    await user.save();
    return {
        accessToken,
        tokenType: "Bearer",
        expiresIn,
        user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            projectIds: user.projectIds,
        },
    };
}
async function getAdminProfile(userId) {
    console.trace("WHO CALLED getAdminProfile?");
    console.log("ARGUMENT TYPE:", typeof userId);
    console.log("SERVICE RECEIVED:", userId);
    console.log("IS STRING:", typeof userId === "string");
    const admin = await User_js_1.User.findById(userId).select("name email role projectIds isActive lastLoginAt createdAt");
    if (!admin || admin.role !== "admin") {
        throw new AuthServiceError("Admin not found", 404, "ADMIN_NOT_FOUND");
    }
    if (!admin.isActive) {
        throw new AuthServiceError("Account is inactive", 403, "ACCOUNT_INACTIVE");
    }
    return {
        id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
        role: admin.role,
        projectIds: admin.projectIds,
        lastLoginAt: admin.lastLoginAt,
        createdAt: admin.createdAt,
    };
}
//# sourceMappingURL=authService.js.map