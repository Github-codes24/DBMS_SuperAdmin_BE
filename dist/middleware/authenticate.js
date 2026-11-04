"use strict";
// import type { RequestHandler } from "express";
// import jwt, { type JwtPayload } from "jsonwebtoken";
// import { apiManager } from "../utils/apiManager.js";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_js_1 = require("../models/User.js");
const httpError_js_1 = require("../utils/httpError.js");
const authenticate = async (req, _res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith("Bearer "))
            throw (0, httpError_js_1.httpError)(401, "UNAUTHORIZED", "Missing access token");
        const secret = process.env.JWT_ACCESS_SECRET;
        if (!secret)
            throw new Error("JWT_ACCESS_SECRET is not configured");
        let payload;
        try {
            const decoded = jsonwebtoken_1.default.verify(header.slice(7), secret, { issuer: "dbms-superadmin-api",
                audience: "dbms-superadmin" });
            if (typeof decoded === "string" || typeof decoded.sub !== "string")
                throw new Error("bad payload");
            payload = decoded;
        }
        catch {
            throw (0, httpError_js_1.httpError)(401, "INVALID_TOKEN", "Invalid or expired access token");
        }
        // Read the user from the DB on EVERY request. This is what makes revocation instant.
        const user = await User_js_1.User.findById(payload.sub).select("name email role isActive tokenVersion projectRoles");
        if (!user || !user.isActive || user.tokenVersion !== (payload.tv ?? 0)) {
            throw (0, httpError_js_1.httpError)(401, "SESSION_REVOKED", "Session is no longer valid");
        }
        req.user = user;
        // Compatibility with older middleware that reads res.locals.auth
        _res.locals.auth = {
            userId: String(user._id),
            role: user.role,
            projectIds: user.projectRoles.filter((p) => p.isActive).map((p) => String(p.projectId)),
        };
        next();
    }
    catch (e) {
        next(e);
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=authenticate.js.map