// controllers/projectUser.controller.ts
import * as svc from "../services/projectAdminService";
import { actorId, param } from "../utils/request.js";
import { ok, wrap } from "./helpers.js";


export const createProjectUser = wrap(async (req, res) =>
  ok(res, await svc.createProjectUser({ ...req.body, projectId:
     param(req, "projectId") },
      actorId(req)), 201));

export const assignRole = wrap(async (req, res) =>
  ok(res, await svc.assignRoleToUser(param(req, "projectId"), 
  param(req, "userId"),
   req.body.roleId, actorId(req))));

export const setProjectAccess = wrap(async (req, res) =>
  ok(res, await svc.setProjectAccess(param(req, "projectId"),
   param(req, "userId"),
    req.body.isActive, actorId(req))));

export const setUserActive = wrap(async (req, res) =>
  ok(res, await svc.setUserActive(param(req, "userId"),
   req.body.isActive, actorId(req))
   ));

export const getProjectUsers = wrap(async (req, res) =>
  ok(res, await svc.getProjectUsers(param(req, "projectId"))));

/** GET /api/platform/project-admins */
export const listProjectAdmins = wrap(async (_req, res) =>
  ok(res, await svc.listProjectAdmins()));

/** POST /api/platform/project-admins */
export const createProjectAdmin = wrap(async (req, res) =>
  ok(res, await svc.createPlatformAdmin(req.body, actorId(req)), 201));

/** PATCH /api/platform/project-admins/:adminId */
export const updateProjectAdmin = wrap(async (req, res) =>
  ok(res, await svc.updatePlatformAdmin(param(req, "adminId"), req.body, actorId(req))));

/** DELETE /api/platform/project-admins/:adminId */
export const deleteProjectAdmin = wrap(async (req, res) =>
  ok(res, await svc.deletePlatformAdmin(param(req, "adminId"), actorId(req))));