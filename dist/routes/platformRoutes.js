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
Object.defineProperty(exports, "__esModule", { value: true });
// routes/platform.routes.ts
const express_1 = require("express");
const authenticate_js_1 = require("../middleware/authenticate.js");
const requireSuperAdmin_js_1 = require("../middleware/requireSuperAdmin.js");
const validate_js_1 = require("../middleware/validate.js");
const v = __importStar(require("../validators/rbac.js"));
const project = __importStar(require("../controllers/projectController.js"));
const role = __importStar(require("../controllers/roleController.js"));
const mod = __importStar(require("../controllers/module.controller.js"));
const pu = __importStar(require("../controllers/projectAdminController.js"));
// import * as me from "../controllers/me.controller.js";
const platform = (0, express_1.Router)();
platform.use(authenticate_js_1.authenticate, requireSuperAdmin_js_1.requireSuperAdmin);
// ==========================================
// PROJECT MANAGEMENT
// ==========================================
// Retrieve all projects available on the platform.
platform.get("/projects", project.getProjects);
// Create a new project on the platform.
platform.post("/projects", (0, validate_js_1.validate)(v.createProjectDto), project.createProject);
// Retrieve projects along with their associated roles.
// Used to populate project and role dropdowns.
platform.get("/projects-with-roles", project.getProjectsWithRoles); // role dropdown
// Update the details or status of an existing project.
platform.patch("/projects/:projectId", (0, validate_js_1.objectIdParams)("projectId"), (0, validate_js_1.validate)(v.updateProjectDto), project.updateProject);
// ==========================================
// GLOBAL ACTION MANAGEMENT
// ==========================================
// Retrieve all available actions from the global action catalog.
platform.get("/actions", mod.listActions);
// Create a new action in the global action catalog.
platform.post("/actions", (0, validate_js_1.validate)(v.createActionDto), mod.createAction);
// Update an existing action using its unique key.
platform.patch("/actions/:key", (0, validate_js_1.validate)(v.updateActionDto), mod.updateAction);
// ==========================================
// PROJECT MODULE MANAGEMENT
// ==========================================
const p = "/projects/:projectId";
// Retrieve all modules configured for a specific project.
platform.get(`${p}/modules`, (0, validate_js_1.objectIdParams)("projectId"), mod.listModules);
// Create multiple modules under a specific project in a single request.
platform.post(`${p}/modules/bulk`, (0, validate_js_1.objectIdParams)("projectId"), (0, validate_js_1.validate)(v.bulkModulesDto), mod.createModules);
// Update the details or active status of a project module.
platform.patch(`${p}/modules/:moduleId`, (0, validate_js_1.objectIdParams)("projectId", "moduleId"), (0, validate_js_1.validate)(v.updateModuleDto), mod.updateModule);
// Configure the actions supported by a specific project module.
platform.put(`${p}/modules/:moduleId/actions`, (0, validate_js_1.objectIdParams)("projectId", "moduleId"), (0, validate_js_1.validate)(v.moduleActionsDto), mod.setModuleActions);
// ==========================================
// PROJECT ROLE MANAGEMENT
// ==========================================
// Retrieve all roles configured for a specific project.
platform.get(`${p}/roles`, (0, validate_js_1.objectIdParams)("projectId"), role.listRoles);
// Create a new role within a specific project.
platform.post(`${p}/roles`, (0, validate_js_1.objectIdParams)("projectId"), (0, validate_js_1.validate)(v.createRoleDto), role.createRole);
// Retrieve the details of a specific project role.
platform.get(`${p}/roles/:roleId`, (0, validate_js_1.objectIdParams)("projectId", "roleId"), role.getRole);
// Update an existing project's role details or configuration.
platform.patch(`${p}/roles/:roleId`, (0, validate_js_1.objectIdParams)("projectId", "roleId"), (0, validate_js_1.validate)(v.updateRoleDto), role.updateRole);
// Delete a role from a specific project.
platform.delete(`${p}/roles/:roleId`, (0, validate_js_1.objectIdParams)("projectId", "roleId"), role.deleteRole);
// Retrieve the permission matrix for a specific project role.
platform.get(`${p}/roles/:roleId/matrix`, (0, validate_js_1.objectIdParams)("projectId", "roleId"), role.getMatrix);
// Save or replace the complete permission set assigned to a role.
platform.put(`${p}/roles/:roleId/permissions`, (0, validate_js_1.objectIdParams)("projectId", "roleId"), (0, validate_js_1.validate)(v.savePermissionsDto), role.savePermissions);
// ==========================================
// PROJECT USER MANAGEMENT
// ==========================================
// Create a user account and assign an initial role within a project.
platform.post(`${p}/users`, (0, validate_js_1.objectIdParams)("projectId"), (0, validate_js_1.validate)(v.createProjectUserDto), pu.createProjectUser);
// Assign a new role or change the existing role of a project user.
platform.put(`${p}/users/:userId/role`, (0, validate_js_1.objectIdParams)("projectId", "userId"), (0, validate_js_1.validate)(v.assignRoleDto), pu.assignRole);
// Enable or suspend a user's access to a specific project.
platform.patch(`${p}/users/:userId/access`, (0, validate_js_1.objectIdParams)("projectId", "userId"), (0, validate_js_1.validate)(v.activeDto), pu.setProjectAccess);
// Activate or deactivate a user's global account.
platform.patch("/users/:userId/active", (0, validate_js_1.objectIdParams)("userId"), (0, validate_js_1.validate)(v.activeDto), pu.setUserActive);
// export const meRouter = Router();
// meRouter.use(authenticate);
// meRouter.get("/projects", me.myProjects);
// meRouter.get("/roles", me.myRoles);
exports.default = platform;
// app.use("/api/v1/platform", platform);  app.use("/api/v1/me", meRouter);
//# sourceMappingURL=platformRoutes.js.map