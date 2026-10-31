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