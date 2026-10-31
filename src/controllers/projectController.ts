// controllers/project.controller.ts
import * as svc from "../services/projectService";
import { actorId, param } from "../utils/request.js";
import { ok, wrap } from "./helpers.js";

// create project on the platform 
export const createProject = wrap(async (req, res) =>
  ok(res, await svc.createProject({
     ...req.body, createdBy: actorId(req)
     }), 201));

     // get your project on the platform 
export const getProjects = wrap(async (_req, res) => 
ok(res, await svc.getProjects()));

// get project with roles 
export const getProjectsWithRoles = wrap(async (_req, res) =>
 ok(res, await svc.getProjectsWithRoles()));

 // update project 
export const updateProject = wrap(async (req, res) =>
  ok(res, await svc.updateProject(param(req, "projectId"), req.body, actorId(req))));