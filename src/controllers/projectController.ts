// controllers/project.controller.ts
import * as svc from "../services/projectService.js";
import { actorId, param } from "../utils/request.js";
import { ok, wrap } from "./helpers.js";

/** GET /api/platform/projects */
export const getProjects = wrap(async (_req, res) =>
  ok(res, await svc.getProjects()));

/** GET /api/platform/projects-with-roles */
export const getProjectsWithRoles = wrap(async (_req, res) =>
  ok(res, await svc.getProjectsWithRoles()));
  
// Get project Role for the particular projects.

export const getRolesByProject = wrap(async (req, res) =>
  ok(res, await svc.getRolesByProject(req.params.projectId as string)));

/** POST /api/platform/projects */
export const createProject = wrap(async (req, res) =>
  ok(res, await svc.createProject({ ...req.body, createdBy: actorId(req) }), 201));

/** PATCH /api/platform/projects/:projectId */
export const updateProject = wrap(async (req, res) =>
  ok(res, await svc.updateProject(param(req, "projectId"), req.body, actorId(req))));

/** DELETE /api/platform/projects/:projectId */
export const deleteProject = wrap(async (req, res) =>
  ok(res, await svc.deleteProject(param(req, "projectId"), actorId(req))));
