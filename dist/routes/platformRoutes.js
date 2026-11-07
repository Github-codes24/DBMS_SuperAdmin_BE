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
const platform = (0, express_1.Router)();
platform.use(authenticate_js_1.authenticate, requireSuperAdmin_js_1.requireSuperAdmin);
// ── PROJECT MANAGEMENT ──────────────────────────────────────────────────────
/** List all tenant projects */
platform.get("/projects", project.getProjects);
/** Create a new tenant project */
platform.post("/projects", (0, validate_js_1.validate)(v.createProjectDto), project.createProject);
/** Projects with their roles (for dropdowns) */
platform.get("/projects-with-roles", project.getProjectsWithRoles);
/** Update a project's details / status */
platform.patch("/projects/:projectId", (0, validate_js_1.objectIdParams)("projectId"), (0, validate_js_1.validate)(v.updateProjectDto), project.updateProject);
/** Delete a tenant project */
platform.delete("/projects/:projectId", (0, validate_js_1.objectIdParams)("projectId"), project.deleteProject);
// ── GLOBAL ACTION MANAGEMENT ─────────────────────────────────────────────────
platform.get("/actions", mod.listActions);
platform.post("/actions", (0, validate_js_1.validate)(v.createActionDto), mod.createAction);
platform.patch("/actions/:key", (0, validate_js_1.validate)(v.updateActionDto), mod.updateAction);
// ── PROJECT MODULE MANAGEMENT ────────────────────────────────────────────────
const p = "/projects/:projectId";
platform.get(`${p}/modules`, (0, validate_js_1.objectIdParams)("projectId"), mod.listModules);
platform.post(`${p}/modules/bulk`, (0, validate_js_1.objectIdParams)("projectId"), (0, validate_js_1.validate)(v.bulkModulesDto), mod.createModules);
platform.patch(`${p}/modules/:moduleId`, (0, validate_js_1.objectIdParams)("projectId", "moduleId"), (0, validate_js_1.validate)(v.updateModuleDto), mod.updateModule);
platform.put(`${p}/modules/:moduleId/actions`, (0, validate_js_1.objectIdParams)("projectId", "moduleId"), (0, validate_js_1.validate)(v.moduleActionsDto), mod.setModuleActions);
// ── PROJECT ROLE MANAGEMENT ──────────────────────────────────────────────────
platform.get(`${p}/roles`, (0, validate_js_1.objectIdParams)("projectId"), role.listRoles);
platform.post(`${p}/roles`, (0, validate_js_1.objectIdParams)("projectId"), (0, validate_js_1.validate)(v.createRoleDto), role.createRole);
platform.get(`${p}/roles/:roleId`, (0, validate_js_1.objectIdParams)("projectId", "roleId"), role.getRole);
platform.patch(`${p}/roles/:roleId`, (0, validate_js_1.objectIdParams)("projectId", "roleId"), (0, validate_js_1.validate)(v.updateRoleDto), role.updateRole);
platform.delete(`${p}/roles/:roleId`, (0, validate_js_1.objectIdParams)("projectId", "roleId"), role.deleteRole);
platform.get(`${p}/roles/:roleId/matrix`, (0, validate_js_1.objectIdParams)("projectId", "roleId"), role.getMatrix);
platform.put(`${p}/roles/:roleId/permissions`, (0, validate_js_1.objectIdParams)("projectId", "roleId"), (0, validate_js_1.validate)(v.savePermissionsDto), role.savePermissions);
// ── PROJECT USER MANAGEMENT ──────────────────────────────────────────────────
platform.post(`${p}/users`, (0, validate_js_1.objectIdParams)("projectId"), (0, validate_js_1.validate)(v.createProjectUserDto), pu.createProjectUser);
platform.put(`${p}/users/:userId/role`, (0, validate_js_1.objectIdParams)("projectId", "userId"), (0, validate_js_1.validate)(v.assignRoleDto), pu.assignRole);
platform.patch(`${p}/users/:userId/access`, (0, validate_js_1.objectIdParams)("projectId", "userId"), (0, validate_js_1.validate)(v.activeDto), pu.setProjectAccess);
platform.patch("/users/:userId/active", (0, validate_js_1.objectIdParams)("userId"), (0, validate_js_1.validate)(v.activeDto), pu.setUserActive);
exports.default = platform;
//# sourceMappingURL=platformRoutes.js.map