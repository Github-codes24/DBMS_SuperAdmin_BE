"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordController = exports.logout = exports.getAdminProfile = exports.refreshToken = exports.login = void 0;
const authService_js_1 = require("../services/authService.js");
const apiManager_js_1 = require("../utils/apiManager.js");
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
const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body ?? {};
        if (typeof refreshToken !== "string" ||
            !refreshToken.trim()) {
            return apiManager_js_1.apiManager.failure(res, "Refresh token is required", 400, "REFRESH_TOKEN_REQUIRED");
        }
        const result = await (0, authService_js_1.refreshUserTokens)(refreshToken);
        return apiManager_js_1.apiManager.success(res, "Access token refreshed successfully", result);
    }
    catch (error) {
        if (error instanceof authService_js_1.AuthServiceError) {
            return apiManager_js_1.apiManager.failure(res, error.message, error.statusCode, error.code);
        }
        return next(error);
    }
};
exports.refreshToken = refreshToken;
const getAdminProfile = async (_req, res, next) => {
    try {
        const auth = res.locals.auth;
        if (!auth?.userId) {
            return apiManager_js_1.apiManager.failure(res, "Authentication required", 401, "AUTHENTICATION_REQUIRED");
        }
        const admin = await (0, authService_js_1.getAdminProfile)(auth.userId);
        return apiManager_js_1.apiManager.
            success(res, "Admin profile fetched", admin);
    }
    catch (error) {
        if (error instanceof authService_js_1.AuthServiceError) {
            return apiManager_js_1.apiManager.failure(res, error.message, error.statusCode, error.code);
        }
        return next(error);
    }
};
exports.getAdminProfile = getAdminProfile;
// export const logout: RequestHandler = async (_req, res, next) => {
//   try {
//     await logoutUser();
//     return apiManager.success(
//       res,
//       "Logout successful",
//       null,
//     );
//   } catch (error: unknown) {
//     return next(error);
//   }
// };
const logout = async (req, res, next) => {
    try {
        const auth = res.locals.auth;
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return apiManager_js_1.apiManager.failure(res, "Refresh token is required", 400, "REFRESH_TOKEN_REQUIRED");
        }
        await (0, authService_js_1.logoutUser)(auth.userId, refreshToken);
        return apiManager_js_1.apiManager.success(res, "Logout successful", null);
    }
    catch (error) {
        if (error instanceof authService_js_1.AuthServiceError) {
            return apiManager_js_1.apiManager.failure(res, error.message, error.statusCode, error.code);
        }
        return next(error);
    }
};
exports.logout = logout;
const changePasswordController = async (_req, res, next) => {
    try {
        const auth = res.locals.auth;
        const validated = res.locals.validated;
        const { currentPassword, newPassword } = validated.body;
        await (0, authService_js_1.changePassword)(auth.userId, currentPassword, newPassword);
        return apiManager_js_1.apiManager.success(res, "Password changed successfully. Please log in again.", null);
    }
    catch (error) {
        if (error instanceof authService_js_1.AuthServiceError) {
            return apiManager_js_1.apiManager.failure(res, error.message, error.statusCode, error.code);
        }
        return next(error);
    }
};
exports.changePasswordController = changePasswordController;
//# sourceMappingURL=authController.js.map