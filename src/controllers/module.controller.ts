import * as svc from "../services/module.service.js";
import { actorId, param } from "../utils/request.js";
import { ok, wrap } from "./helpers.js";

// Retrieve all modules configured for a specific project.
export const listModules = wrap(async (req, res) =>
  ok(res, await svc.listModules(param(req, "projectId"))));

// Create multiple modules under a specific project.
export const createModules = wrap(async (req, res) =>
  ok(res, await svc.createModules(param(req, "projectId"),
   req.body.modules, actorId(req)),
    201));

 // Update a project's module details or active status.
export const updateModule = wrap(async (req, res) =>
  ok(res, await svc.updateModule(param(req, "projectId"),
   param(req, "moduleId"), 
   req.body,
    actorId(req))));

// Configure or replace the actions assigned to a specific project module.
export const setModuleActions = wrap(async (req, res) =>
  ok(res, await svc.setModuleActions(param(req, "projectId"),
   param(req, "moduleId"),
   req.body.actions,
    actorId(req))));

// Retrieve all available actions from the global action catalog.
export const listActions = wrap(async (_req, res) =>
 ok(res, await svc.listActions()));

// Create a new action in the global action catalog.
export const createAction = wrap(async (req, res) =>
  ok(res, await svc.createAction(req.body,
     actorId(req)),
      201));

 // Update an existing action in the global action catalog.
export const updateAction = wrap(async (req, res) =>
  ok(res, await svc.updateAction(param(req, "key"),
   req.body,
    actorId(req))));