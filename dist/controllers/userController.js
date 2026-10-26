"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.resetPassword = exports.updateUserStatus = exports.updateUser = exports.createUser = exports.getUser = exports.getUsers = void 0;
const userService_js_1 = require("../services/userService.js");
const apiManager_js_1 = require("../utils/apiManager.js");
function handleUserError(error, res, next) {
    if (error instanceof userService_js_1.UserServiceError) {
        return apiManager_js_1.apiManager.failure(res, error.message, error.statusCode, error.code);
    }
    return next(error);
}
const getUsers = async (_req, res, next) => {
    try {
        const validated = res.locals.validated;
        const auth = res.locals.auth;
        const result = await (0, userService_js_1.listUsers)(validated.query, auth);
        return apiManager_js_1.apiManager.success(res, "Users retrieved successfully", result);
    }
    catch (error) {
        return handleUserError(error, res, next);
    }
};
exports.getUsers = getUsers;
const getUser = async (_req, res, next) => {
    try {
        const validated = res.locals.validated;
        const result = await (0, userService_js_1.getUserById)(validated.params.id);
        return apiManager_js_1.apiManager.success(res, "User retrieved successfully", result);
    }
    catch (error) {
        return handleUserError(error, res, next);
    }
};
exports.getUser = getUser;
const createUser = async (_req, res, next) => {
    try {
        const validated = res.locals.validated;
        const auth = res.locals.auth;
        const result = await (0, userService_js_1.createUser)(validated.body, auth);
        return apiManager_js_1.apiManager.success(res, "User created successfully", result, 201);
    }
    catch (error) {
        return handleUserError(error, res, next);
    }
};
exports.createUser = createUser;
const updateUser = async (_req, res, next) => {
    try {
        const validated = res.locals.validated;
        const auth = res.locals.auth;
        const result = await (0, userService_js_1.updateUser)(validated.params.id, validated.body, auth);
        return apiManager_js_1.apiManager.success(res, "User updated successfully", result);
    }
    catch (error) {
        return handleUserError(error, res, next);
    }
};
exports.updateUser = updateUser;
const updateUserStatus = async (_req, res, next) => {
    try {
        const validated = res.locals.validated;
        const auth = res.locals.auth;
        const result = await (0, userService_js_1.updateUserStatus)(validated.params.id, validated.body.isActive, auth);
        return apiManager_js_1.apiManager.success(res, "User status updated successfully", result);
    }
    catch (error) {
        return handleUserError(error, res, next);
    }
};
exports.updateUserStatus = updateUserStatus;
const resetPassword = async (_req, res, next) => {
    try {
        const validated = res.locals.validated;
        const auth = res.locals.auth;
        const result = await (0, userService_js_1.resetUserPassword)(validated.params.id, validated.body.password, auth);
        return apiManager_js_1.apiManager.success(res, "User password reset successfully", result);
    }
    catch (error) {
        return handleUserError(error, res, next);
    }
};
exports.resetPassword = resetPassword;
const deleteUser = async (_req, res, next) => {
    try {
        const validated = res.locals.validated;
        const auth = res.locals.auth;
        const result = await (0, userService_js_1.deleteUser)(validated.params.id, auth);
        return apiManager_js_1.apiManager.success(res, "User deleted successfully", result);
    }
    catch (error) {
        return handleUserError(error, res, next);
    }
};
exports.deleteUser = deleteUser;
//# sourceMappingURL=userController.js.map