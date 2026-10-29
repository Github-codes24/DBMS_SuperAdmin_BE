"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjects = exports.createProject = void 0;
const projectService_js_1 = require("../services/projectService.js");
const apiManager_js_1 = require("../utils/apiManager.js");
const createProject = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        if (typeof name !== "string" ||
            name.trim().length < 2 ||
            name.trim().length > 100 ||
            (description !== undefined && typeof description !== "string")) {
            return apiManager_js_1.apiManager.failure(res, "Valid projectId, name, description, and status are required", 400, "INVALID_PROJECT");
        }
        const auth = res.locals.auth;
        if (!auth?.userId || auth.role !== "superadmin") {
            return apiManager_js_1.apiManager.failure(res, "Only SuperAdmin can create projects", 403, "FORBIDDEN");
        }
        const project = await (0, projectService_js_1.createProject)({
            name,
            description,
            createdBy: auth.userId,
        });
        return apiManager_js_1.apiManager.success(res, "Project created successfully", project, 201);
    }
    catch (error) {
        if (typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === 11000) {
            return apiManager_js_1.apiManager.failure(res, "Project ID already exists", 409, "DUPLICATE_PROJECT");
        }
        return next(error);
    }
};
exports.createProject = createProject;
const getProjects = async (_req, res, next) => {
    try {
        const projects = await (0, projectService_js_1.getProjects)();
        return apiManager_js_1.apiManager.success(res, "Projects fetched successfully", projects, 200);
    }
    catch (error) {
        return next(error);
    }
};
exports.getProjects = getProjects;
//# sourceMappingURL=projectController.js.map