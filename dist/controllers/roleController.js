"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignRoleToUser = exports.getRolesByProject = exports.createRole = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const apiManager_1 = require("../utils/apiManager"); // adjust path
const roleService = __importStar(require("../services/roleService")); // adjust path
const createRole = async (req, res, next) => {
    try {
        const projectId = Array.isArray(req.params.projectId)
            ? req.params.projectId[0]
            : req.params.projectId;
        const { name, description, permissions } = req.body;
        const auth = res.locals.auth;
        if (!mongoose_1.default.isValidObjectId(projectId)) {
            return apiManager_1.apiManager.failure(res, "Invalid project ID", 400, "INVALID_PROJECT_ID");
        }
        if (typeof name !== "string" ||
            !name.trim() ||
            (description !== undefined && typeof description !== "string") ||
            (permissions !== undefined &&
                (!Array.isArray(permissions) || !permissions.every((k) => typeof k === "string")))) {
            return apiManager_1.apiManager.failure(res, "A valid name, description, and permissions array are required", 400, "INVALID_ROLE");
        }
        // SuperAdmin can create for any project.
        // Project Admin can create only for their own projects.
        if (auth.role !== "superadmin") {
            if (!auth.projectIds?.includes(projectId)) {
                return apiManager_1.apiManager.failure(res, "You do not have access to this project", 403, "FORBIDDEN");
            }
        }
        const role = await roleService.createRole({
            name,
            description,
            permissions,
            projectId,
            createdBy: auth.userId,
        });
        return apiManager_1.apiManager.success(res, "Role created successfully", role, 201);
    }
    catch (error) {
        next(error);
    }
};
exports.createRole = createRole;
const getRolesByProject = async (req, res, next) => {
    try {
        const projectId = Array.isArray(req.params.projectId)
            ? req.params.projectId[0]
            : req.params.projectId;
        const auth = res.locals.auth;
        if (!mongoose_1.default.isValidObjectId(projectId)) {
            return apiManager_1.apiManager.failure(res, "Invalid project ID", 400, "INVALID_PROJECT_ID");
        }
        if (auth.role !== "superadmin" && !auth.projectIds?.includes(projectId)) {
            return apiManager_1.apiManager.failure(res, "You do not have access to this project", 403, "FORBIDDEN");
        }
        const roles = await roleService.getRolesByProject(projectId);
        return apiManager_1.apiManager.success(res, "Roles fetched successfully", roles);
    }
    catch (error) {
        next(error);
    }
};
exports.getRolesByProject = getRolesByProject;
const assignRoleToUser = async (req, res, next) => {
    try {
        const projectId = Array.isArray(req.params.projectId)
            ? req.params.projectId[0]
            : req.params.projectId;
        const userId = Array.isArray(req.params.userId)
            ? req.params.userId[0]
            : req.params.userId;
        const { roleId } = req.body;
        const auth = res.locals.auth;
        if (!mongoose_1.default.isValidObjectId(projectId) || !mongoose_1.default.isValidObjectId(userId)) {
            return apiManager_1.apiManager.failure(res, "Invalid project or user ID", 400, "INVALID_ID");
        }
        if (typeof roleId !== "string" || !mongoose_1.default.isValidObjectId(roleId)) {
            return apiManager_1.apiManager.failure(res, "Valid roleId is required", 400, "INVALID_ROLE_ID");
        }
        if (auth.role !== "superadmin" && !auth.projectIds?.includes(projectId)) {
            return apiManager_1.apiManager.failure(res, "You do not have access to this project", 403, "FORBIDDEN");
        }
        const result = await roleService.assignRoleToUser(userId, projectId, roleId);
        return apiManager_1.apiManager.success(res, "Role assigned successfully", result);
    }
    catch (error) {
        next(error);
    }
};
exports.assignRoleToUser = assignRoleToUser;
//# sourceMappingURL=roleController.js.map