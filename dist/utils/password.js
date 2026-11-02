"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.generateRefreshToken = generateRefreshToken;
exports.hashRefreshToken = hashRefreshToken;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const node_crypto_1 = require("node:crypto");
const SALT_ROUNDS = 12;
async function hashPassword(password) {
    return bcryptjs_1.default.hash(password, SALT_ROUNDS);
}
async function verifyPassword(password, passwordHash) {
    return bcryptjs_1.default.compare(password, passwordHash);
}
// generate refresh tokens 
function generateRefreshToken(userId) {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error("JWT_REFRESH_SECRET must be configured with at least 32 characters");
    }
    return jsonwebtoken_1.default.sign({ tokenUse: "refresh" }, secret, {
        subject: userId,
        expiresIn: "7d",
        issuer: "dbms-superadmin-api",
        audience: "dbms-superadmin",
    });
}
// create hash 
function hashRefreshToken(token) {
    return (0, node_crypto_1.createHash)("sha256")
        .update(token)
        .digest("hex");
}
//# sourceMappingURL=password.js.map