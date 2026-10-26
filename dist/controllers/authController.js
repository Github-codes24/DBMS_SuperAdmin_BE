"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminProfile = exports.login = void 0;
const authService_js_1 = require("../services/authService.js");
const apiManager_js_1 = require("../utils/apiManager.js");
// import {
//   getAdminProfile as getAdminProfileService,
//   AuthServiceError,
// } from "../services/authService.js"
const login = async (_req, res, next) => {
    try {
        const validated = res.locals.validated;
        const result = await (0, authService_js_1.loginUser)(validated.body.email, validated.body.password);
        return apiManager_js_1.apiManager.success(res, "Login successful", result);
    }
    catch (error) {
        if (error instanceof authService_js_1.AuthServiceError) {
            return apiManager_js_1.apiManager.failure(res, error.message, error.statusCode, error.code);
        }
        return next(error);
    }
};
exports.login = login;
const getAdminProfile = async (_req, res, next) => {
    try {
        console.log("🔥 GET ADMIN CONTROLLER HIT");
        const auth = res.locals.auth;
        if (!auth?.userId) {
            return apiManager_js_1.apiManager.failure(res, "Authentication required", 401, "AUTHENTICATION_REQUIRED");
        }
        const admin = await (0, authService_js_1.getAdminProfile)(auth.userId);
        return apiManager_js_1.apiManager.success(res, "Admin profile fetched", admin);
    }
    catch (error) {
        if (error instanceof authService_js_1.AuthServiceError) {
            return apiManager_js_1.apiManager.failure(res, error.message, error.statusCode, error.code);
        }
        return next(error);
    }
};
exports.getAdminProfile = getAdminProfile;
//# sourceMappingURL=authController.js.map