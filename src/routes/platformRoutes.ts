// routes/platform.routes.ts
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin.js";
import { validate, objectIdParams } from "../middleware/validate.js";
import * as v from "../validators/rbac.js";
import * as project from "../controllers/projectController.js";
import * as role from "../controllers/roleController.js";
import * as mod from "../controllers/module.controller.js";
import * as pu from "../controllers/projectAdminController.js";

const platform = Router();
platform.use(authenticate, requireSuperAdmin);

// ── PROJECT MANAGEMENT ──────────────────────────────────────────────────────

/** List all tenant projects */
platform.get("/projects", project.getProjects);

/** Create a new tenant project */
platform.post("/projects", validate(v.createProjectDto), project.createProject);

/** Projects with their roles (for dropdowns) */
platform.get("/projects-with-roles", project.getProjectsWithRoles);

/** Update a project's details / status */
platform.patch(
  "/projects/:projectId",
  objectIdParams("projectId"),
  validate(v.updateProjectDto),
  project.updateProject,
);

/** Delete a tenant project */
platform.delete(
  "/projects/:projectId",
  objectIdParams("projectId"),
  project.deleteProject,
);

/** Child Project Health Check & Live Status Probe */
platform.get(
  "/projects/:projectId/health",
  objectIdParams("projectId"),
  project.checkProjectHealth,
);

/** Child Bridge Data Proxy Endpoints */
platform.get(
  "/projects/:projectId/bridge/stats",
  objectIdParams("projectId"),
  project.getChildStats,
);
platform.get(
  "/projects/:projectId/bridge/modules",
  objectIdParams("projectId"),
  project.getChildModules,
);
platform.get(
  "/projects/:projectId/bridge/users",
  objectIdParams("projectId"),
  project.getChildUsers,
);
platform.get(
  "/projects/:projectId/bridge/roles",
  objectIdParams("projectId"),
  project.getChildRoles,
);

/** SSO Launch Ticket Generator */
platform.post(
  "/projects/:projectId/sso/launch",
  objectIdParams("projectId"),
  project.launchSso,
);

// ── GLOBAL ACTION MANAGEMENT ─────────────────────────────────────────────────

platform.get("/actions", mod.listActions);
platform.post("/actions", validate(v.createActionDto), mod.createAction);
platform.patch("/actions/:key", validate(v.updateActionDto), mod.updateAction);

// ── PROJECT MODULE MANAGEMENT ────────────────────────────────────────────────

const p = "/projects/:projectId";

platform.get(`${p}/modules`, objectIdParams("projectId"), mod.listModules);

platform.post(
  `${p}/modules/bulk`,
  objectIdParams("projectId"),
  validate(v.bulkModulesDto),
  mod.createModules,
);

platform.patch(
  `${p}/modules/:moduleId`,
  objectIdParams("projectId", "moduleId"),
  validate(v.updateModuleDto),
  mod.updateModule,
);

platform.put(
  `${p}/modules/:moduleId/actions`,
  objectIdParams("projectId", "moduleId"),
  validate(v.moduleActionsDto),
  mod.setModuleActions,
);

// ── PROJECT ROLE MANAGEMENT ──────────────────────────────────────────────────

platform.get(`${p}/roles`, objectIdParams("projectId"), role.listRoles);
platform.post(
  `${p}/roles`,
  objectIdParams("projectId"),
  validate(v.createRoleDto),
  role.createRole,
);
platform.get(
  `${p}/roles/:roleId`,
  objectIdParams("projectId", "roleId"),
  role.getRole,
);
platform.patch(
  `${p}/roles/:roleId`,
  objectIdParams("projectId", "roleId"),
  validate(v.updateRoleDto),
  role.updateRole,
);
platform.delete(
  `${p}/roles/:roleId`,
  objectIdParams("projectId", "roleId"),
  role.deleteRole,
);
platform.get(
  `${p}/roles/:roleId/matrix`,
  objectIdParams("projectId", "roleId"),
  role.getMatrix,
);
platform.put(
  `${p}/roles/:roleId/permissions`,
  objectIdParams("projectId", "roleId"),
  validate(v.savePermissionsDto),
  role.savePermissions,
);

// ── PROJECT USER MANAGEMENT ──────────────────────────────────────────────────

platform.post(
  `${p}/users`,
  objectIdParams("projectId"),
  validate(v.createProjectUserDto),
  pu.createProjectUser,
);
platform.put(
  `${p}/users/:userId/role`,
  objectIdParams("projectId", "userId"),
  validate(v.assignRoleDto),
  pu.assignRole,
);
platform.patch(
  `${p}/users/:userId/access`,
  objectIdParams("projectId", "userId"),
  validate(v.activeDto),
  pu.setProjectAccess,
);
platform.patch(
  "/users/:userId/active",
  objectIdParams("userId"),
  validate(v.activeDto),
  pu.setUserActive,
);

export default platform;
