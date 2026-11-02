"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectAdminController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const projectAdminService_js_1 = require("../services/projectAdminService.js");
const apiManager_js_1 = require("../utils/apiManager.js");
const createProjectAdminController = async (req, res, next) => {
    try {
        // const projectId = req.params.projectId;
        const projectId = Array.isArray(req.params.projectId)
            ? req.params.projectId[0]
            : req.params.projectId;
        const { name, email, password } = req.body;
        if (!mongoose_1.default.isValidObjectId(projectId)) {
            return apiManager_js_1.apiManager.failure(res, "Invalid project ID", 400, "INVALID_PROJECT_ID");
        }
        if (typeof name !== "string" ||
            name.trim().length < 2 ||
            typeof email !== "string" ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
            typeof password !== "string" ||
            password.length < 8) {
            return apiManager_js_1.apiManager.failure(res, "Valid name, email, and password (at least 8 characters) are required", 400, "INVALID_PROJECT_ADMIN");
        }
        const admin = await (0, projectAdminService_js_1.createProjectAdmin)({
            projectId,
            name,
            email,
            password,
        });
        return apiManager_js_1.apiManager.success(res, "Project Admin created successfully", admin, 201);
    }
    catch (error) {
        next(error);
    }
};
exports.createProjectAdminController = createProjectAdminController;
//# sourceMappingURL=projectAdminController.js.map