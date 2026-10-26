"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const apiManager_js_1 = require("../utils/apiManager.js");
const authenticate = (req, res, next) => {
    const token = apiManager_js_1.apiManager.getBearerToken(req);
    if (!token) {
        return apiManager_js_1.apiManager.failure(res, "Authentication required", 401, "AUTHENTICATION_REQUIRED");
    }
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret || secret.length < 32) {
        return next(new Error("JWT_ACCESS_SECRET must be configured with at least 32 characters"));
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, secret, {
            issuer: "dbms-superadmin-api",
            audience: "dbms-superadmin",
        });
        res.locals.auth = {
            userId: payload.sub,
            role: payload.role,
            projectIds: payload.projectIds ?? [],
        };
        next();
    }
    catch {
        return apiManager_js_1.apiManager.failure(res, "Invalid or expired access token", 401, "INVALID_ACCESS_TOKEN");
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=authenticate.js.map