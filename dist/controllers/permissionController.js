"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPermissions = exports.createPermission = void 0;
const permissionService_js_1 = require("../services/permissionService.js");
const apiManager_js_1 = require("../utils/apiManager.js");
const createPermission = async (req, res, next) => {
    try {
        const { name, key, description } = req.body;
        if (typeof name !== "string" ||
            !name.trim() ||
            typeof key !== "string" ||
            !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/i.test(key.trim()) ||
            (description !== undefined && typeof description !== "string")) {
            return apiManager_js_1.apiManager.failure(res, "Valid name, key, and description are required", 400, "INVALID_PERMISSION");
        }
        const permission = await (0, permissionService_js_1.createPermission)({
            name,
            key,
            description,
        });
        return apiManager_js_1.apiManager.success(res, "Permission created successfully", permission, 201);
    }
    catch (error) {
        if (typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === 11000) {
            return apiManager_js_1.apiManager.failure(res, "Permission name or key already exists", 409, "DUPLICATE_PERMISSION");
        }
        next(error);
    }
};
exports.createPermission = createPermission;
const getPermissions = async (_req, res, next) => {
    try {
        const permissions = await (0, permissionService_js_1.getPermissions)();
        return apiManager_js_1.apiManager.success(res, "Permissions fetched successfully", permissions, 200);
    }
    catch (error) {
        next(error);
    }
};
exports.getPermissions = getPermissions;
//# sourceMappingURL=permissionController.js.map