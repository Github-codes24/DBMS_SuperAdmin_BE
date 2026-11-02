"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthServiceError = void 0;
exports.refreshUserTokens = refreshUserTokens;
exports.loginUser = loginUser;
exports.getAdminProfile = getAdminProfile;
exports.logoutUser = logoutUser;
exports.changePassword = changePassword;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_js_1 = require("../models/User.js");
const password_js_1 = require("../utils/password.js");
const password_js_2 = require("../utils/password.js");
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
async function refreshUserTokens(refreshToken) {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error("JWT_REFRESH_SECRET is not configured correctly");
    }
    let userId;
    // 1. Verify the refresh JWT
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, secret, {
            issuer: "dbms-superadmin-api",
            audience: "dbms-superadmin",
        });
        if (typeof decoded === "string" ||
            decoded.tokenUse !== "refresh" ||
            typeof decoded.sub !== "string") {
            throw new Error("Invalid refresh token");
        }
        userId = decoded.sub;
    }
    catch {
        throw new AuthServiceError("Invalid or expired refresh token", 401, "INVALID_REFRESH_TOKEN");
    }
    // 2. Check whether the user is active
    const user = await User_js_1.User.findById(userId).select("role projectIds isActive");
    if (!user || !user.isActive) {
        throw new AuthServiceError("Account is unavailable", 401, "ACCOUNT_UNAVAILABLE");
    }
    // 3. Validate the refresh-token session in MongoDB
    const oldTokenHash = (0, password_js_2.hashRefreshToken)(refreshToken);
    const now = new Date();
    // 4. Generate the replacement refresh token
    const newRefreshToken = (0, password_js_2.generateRefreshToken)(userId);
    const newTokenHash = (0, password_js_2.hashRefreshToken)(newRefreshToken);
    const newExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    // Atomically replace the old token hash.
    // A reused, revoked, or expired session will not match.
    const session = await User_js_1.RefreshSession.findOneAndUpdate({
        userId: user._id,
        tokenHash: oldTokenHash,
        revokedAt: null,
        expiresAt: { $gt: now },
    }, {
        $set: {
            tokenHash: newTokenHash,
            expiresAt: newExpiresAt,
        },
    }, { new: true });
    if (!session) {
        throw new AuthServiceError("Invalid, expired, or revoked refresh session", 401, "INVALID_REFRESH_SESSION");
    }
    // 5. Generate a new access token
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    if (!accessSecret || accessSecret.length < 32) {
        throw new Error("JWT_ACCESS_SECRET is not configured correctly");
    }
    const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
    const accessToken = jsonwebtoken_1.default.sign({
        role: user.role,
        projectIds: user.projectIds,
    }, accessSecret, {
        subject: user._id.toString(),
        expiresIn: expiresIn,
        issuer: "dbms-superadmin-api",
        audience: "dbms-superadmin",
    });
    // 6. Return BOTH replacement tokens
    return {
        accessToken,
        refreshToken: newRefreshToken,
        tokenType: "Bearer",
        expiresIn,
    };
}
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
    // refresh token generation 
    const refreshToken = (0, password_js_2.generateRefreshToken)(user._id.toString());
    // save the  hashed refresh token to  the database 
    await User_js_1.RefreshSession.create({
        userId: user._id,
        tokenHash: (0, password_js_2.hashRefreshToken)(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    user.lastLoginAt = new Date();
    await user.save();
    return {
        accessToken,
        refreshToken,
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
    try {
        const admin = await User_js_1.User.findById(userId).select("name email role projectIds isActive lastLoginAt createdAt");
        if (!admin || admin.role !== "superadmin") {
            throw new AuthServiceError("Platform Super Admin not found", 404, "Platform Super Admin_NOT_FOUND");
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
    catch (error) {
        throw error;
    }
}
async function logoutUser(userId, refreshToken) {
    await User_js_1.RefreshSession.updateOne({
        userId,
        tokenHash: (0, password_js_2.hashRefreshToken)(refreshToken),
        revokedAt: null,
    }, {
        $set: { revokedAt: new Date() },
    });
}
async function changePassword(userId, currentPassword, newPassword) {
    const user = await User_js_1.User.findById(userId).select("+passwordHash");
    if (!user || !user.isActive) {
        throw new AuthServiceError("Account is unavailable", 401, "ACCOUNT_UNAVAILABLE");
    }
    const isValid = await bcrypt_1.default.compare(currentPassword, user.passwordHash);
    if (!isValid) {
        throw new AuthServiceError("Current password is incorrect", 401, "INVALID_CURRENT_PASSWORD");
    }
    const isSamePassword = await bcrypt_1.default.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
        throw new AuthServiceError("New password must differ from the current password", 400, "SAME_PASSWORD");
    }
    user.passwordHash = await bcrypt_1.default.hash(newPassword, 12);
    await user.save();
    await User_js_1.RefreshSession.updateMany({
        userId: user._id,
        revokedAt: null,
    }, {
        $set: { revokedAt: new Date() },
    });
}
//# sourceMappingURL=authService.js.map