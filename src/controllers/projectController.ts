
import type { RequestHandler } from "express";
import {
  createProject as createProjectService,
  // getProjects as getProjectsService,
} from "../services/projectService.js";
import { apiManager } from "../utils/apiManager.js";
import * as projectService from "../services/projectService";

export const createProject: RequestHandler = async (req, res, next) => {
  try {
    const {  name, description } = req.body;

    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 100 ||
      (description !== undefined && typeof description !== "string") 
      
    ) {
      return apiManager.failure(
        res,
        "Valid projectId, name, description, and status are required",
        400,
        "INVALID_PROJECT",
      );
    }

    const auth = res.locals.auth as
      | { userId?: string; role?: string }
      | undefined;

    if (!auth?.userId || auth.role !== "superadmin") {
      return apiManager.failure(
        res,
        "Only SuperAdmin can create projects",
        403,
        "FORBIDDEN",
      );
    }

    const project = await createProjectService({
      name,
      description,
      createdBy: auth.userId,
    });

    return apiManager.success(
      res,
      "Project created successfully",
      project,
      201,
    );
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return apiManager.failure(
        res,
        "Project ID already exists",
        409,
        "DUPLICATE_PROJECT",
      );
    }

    return next(error);
  }
};

export const getMyProjects: RequestHandler = async (req, res, next) => {
  try {
    const auth = res.locals.auth as { userId: string; role: string };

    const projects = await projectService.getMyProjects(auth.userId, auth.role);

    return apiManager.success(res, "Projects fetched successfully", projects);
  } catch (error) {
    next(error);
  }
};

