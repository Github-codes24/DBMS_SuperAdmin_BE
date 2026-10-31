// controllers/role.controller.ts
import * as svc from "../services/roleService";
import { actorId, param } from "../utils/request.js";
import { ok, wrap } from "./helpers.js";

export const createRole = wrap(async (req, res) =>
  ok(res, await svc.createRole(param(req, "projectId"), req.body, actorId(req)), 201));
export const listRoles = wrap(async (req, res) =>
  ok(res, await svc.getRolesByProject(param(req, "projectId"))));
export const getRole = wrap(async (req, res) =>
  ok(res, await svc.getRoleById(param(req, "projectId"), param(req, "roleId"))));
export const updateRole = wrap(async (req, res) =>
  ok(res, await svc.updateRole(param(req, "projectId"), param(req, "roleId"), req.body, actorId(req))));
export const deleteRole = wrap(async (req, res) =>
  ok(res, await svc.deleteRole(param(req, "projectId"), param(req, "roleId"), actorId(req))));
export const getMatrix = wrap(async (req, res) =>
  ok(res, await svc.getMatrix(param(req, "projectId"), param(req, "roleId"))));
export const savePermissions = wrap(async (req, res) =>
  ok(res, await svc.savePermissions(
    param(req, "projectId"), param(req, "roleId"),
    req.body.permissions, req.body.expectedVersion, actorId(req),
  )));