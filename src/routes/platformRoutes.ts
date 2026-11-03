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
// import * as me from "../controllers/me.controller.js";

const platform = Router();
platform.use(authenticate, requireSuperAdmin);                        

// ==========================================
// PROJECT MANAGEMENT
// ==========================================

// Retrieve all projects available on the platform.
platform.get("/projects", project.getProjects);

// Create a new project on the platform.
platform.post("/projects", validate(v.createProjectDto),
 project.createProject);

// Retrieve projects along with their associated roles.
// Used to populate project and role dropdowns.
platform.get("/projects-with-roles", project.getProjectsWithRoles);   // role dropdown

// Update the details or status of an existing project.
platform.patch("/projects/:projectId", objectIdParams("projectId"),
validate(v.updateProjectDto),
 project.updateProject);

 // ==========================================
// GLOBAL ACTION MANAGEMENT
// ==========================================

// Retrieve all available actions from the global action catalog.
platform.get("/actions", mod.listActions);

// Create a new action in the global action catalog.
platform.post("/actions",
 validate(v.createActionDto),
  mod.createAction);

// Update an existing action using its unique key.
platform.patch("/actions/:key",
 validate(v.updateActionDto),
  mod.updateAction);

  // ==========================================
// PROJECT MODULE MANAGEMENT
// ==========================================

const p = "/projects/:projectId";
// Retrieve all modules configured for a specific project.
platform.get(`${p}/modules`, objectIdParams("projectId"), mod.listModules);

// Create multiple modules under a specific project in a single request.
platform.post(`${p}/modules/bulk`,
 objectIdParams("projectId"),
  validate(v.bulkModulesDto),
   mod.createModules);

// Update the details or active status of a project module.
platform.patch(`${p}/modules/:moduleId`,
 objectIdParams("projectId",
  "moduleId"),
   validate(v.updateModuleDto),
    mod.updateModule);

// Configure the actions supported by a specific project module.
platform.put(`${p}/modules/:moduleId/actions`,
 objectIdParams("projectId", "moduleId"),
  validate(v.moduleActionsDto),
   mod.setModuleActions);

  // ==========================================
// PROJECT ROLE MANAGEMENT
// ==========================================

// Retrieve all roles configured for a specific project.
platform.get(`${p}/roles`,
 objectIdParams("projectId"),
  role.listRoles);

// Create a new role within a specific project.
platform.post(`${p}/roles`,
 objectIdParams("projectId"),
  validate(v.createRoleDto),
   role.createRole);

// Retrieve the details of a specific project role.
platform.get(`${p}/roles/:roleId`,
 objectIdParams("projectId",
  "roleId"),
   role.getRole);

// Update an existing project's role details or configuration.
platform.patch(`${p}/roles/:roleId`,
 objectIdParams("projectId", "roleId"),
  validate(v.updateRoleDto),
   role.updateRole);

   // Delete a role from a specific project.
platform.delete(`${p}/roles/:roleId`, 
objectIdParams("projectId", "roleId"),
 role.deleteRole);

// Retrieve the permission matrix for a specific project role.
platform.get(`${p}/roles/:roleId/matrix`,
 objectIdParams("projectId", "roleId"), 
 role.getMatrix);

 // Save or replace the complete permission set assigned to a role.
platform.put(`${p}/roles/:roleId/permissions`,
 objectIdParams("projectId", "roleId"),
  validate(v.savePermissionsDto),
   role.savePermissions);

   // ==========================================
// PROJECT USER MANAGEMENT
// ==========================================

// Create a user account and assign an initial role within a project.
platform.post(`${p}/users`,
 objectIdParams("projectId"),
  validate(v.createProjectUserDto),
   pu.createProjectUser);

   // Assign a new role or change the existing role of a project user.
platform.put(`${p}/users/:userId/role`,
 objectIdParams("projectId", "userId"),
  validate(v.assignRoleDto),
   pu.assignRole);

// Enable or suspend a user's access to a specific project.
platform.patch(`${p}/users/:userId/access`,
 objectIdParams("projectId", "userId"),
  validate(v.activeDto),
   pu.setProjectAccess);

   // Activate or deactivate a user's global account.
platform.patch("/users/:userId/active",
 objectIdParams("userId"),
  validate(v.activeDto),
   pu.setUserActive);

// export const meRouter = Router();
// meRouter.use(authenticate);
// meRouter.get("/projects", me.myProjects);
// meRouter.get("/roles", me.myRoles);

export default platform;
// app.use("/api/v1/platform", platform);  app.use("/api/v1/me", meRouter);