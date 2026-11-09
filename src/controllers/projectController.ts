// controllers/project.controller.ts
import * as svc from "../services/projectService.js";
import * as bridgeSvc from "../services/childBridge.service.js";
import { actorId, param } from "../utils/request.js";
import { ok, wrap } from "./helpers.js";

/** GET /api/platform/projects */
export const getProjects = wrap(async (_req, res) =>
  ok(res, await svc.getProjects()));

/** GET /api/platform/projects-with-roles */
export const getProjectsWithRoles = wrap(async (_req, res) =>
  ok(res, await svc.getProjectsWithRoles()));

/** POST /api/platform/projects */
export const createProject = wrap(async (req, res) =>
  ok(res, await svc.createProject({ ...req.body, createdBy: actorId(req) }), 201));

/** PATCH /api/platform/projects/:projectId */
export const updateProject = wrap(async (req, res) =>
  ok(res, await svc.updateProject(param(req, "projectId"), req.body, actorId(req))));

/** DELETE /api/platform/projects/:projectId */
export const deleteProject = wrap(async (req, res) =>
  ok(res, await svc.deleteProject(param(req, "projectId"), actorId(req))));

/** GET /api/platform/projects/:projectId/health */
export const checkProjectHealth = wrap(async (req, res) =>
  ok(res, await bridgeSvc.checkProjectHealth(param(req, "projectId"))));

/** GET /api/platform/projects/:projectId/bridge/stats */
export const getChildStats = wrap(async (req, res) =>
  ok(res, await bridgeSvc.getChildStats(param(req, "projectId"))));

/** GET /api/platform/projects/:projectId/bridge/modules */
export const getChildModules = wrap(async (req, res) =>
  ok(res, await bridgeSvc.getChildModules(param(req, "projectId"))));

/** GET /api/platform/projects/:projectId/bridge/users */
export const getChildUsers = wrap(async (req, res) =>
  ok(res, await bridgeSvc.getChildUsers(param(req, "projectId"), req.query)));

/** GET /api/platform/projects/:projectId/bridge/roles */
export const getChildRoles = wrap(async (req, res) =>
  ok(res, await bridgeSvc.getChildRoles(param(req, "projectId"))));

/** PATCH /api/platform/projects/:projectId/bridge/users/:userId/status */
export const updateChildUserStatus = wrap(async (req, res) =>
  ok(
    res,
    await bridgeSvc.updateChildUserStatus(
      param(req, "projectId"),
      param(req, "userId"),
      req.body.status,
    ),
  ));


/** POST /api/platform/projects/:projectId/sso/launch */
export const launchSso = wrap(async (req, res) => {
  const actor = {
    id: actorId(req),
    email: req.user?.email,
    name: req.user?.name,
    role: req.user?.role,
  };
  ok(
    res,
    await bridgeSvc.launchSsoSession(param(req, "projectId"), actor, req.body),
  );
});


