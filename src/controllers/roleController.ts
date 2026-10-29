
// import type { RequestHandler } from "express";
// import mongoose from "mongoose";
// import {
//   createRole as createRoleService,
//   getRoles as getRolesService,
//   updateRole as updateRoleService,
//   RoleServiceError,
// } from "../services/roleService.js";
// import { apiManager } from "../utils/apiManager.js";
/*
function handleError(error: unknown, res: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) {
  if (error instanceof RoleServiceError) {
    return apiManager.failure(
      res,
      error.message,
      error.statusCode,
      error.errorCode,
    );
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  ) {
    return apiManager.failure(
      res,
      "A role with this name already exists",
      409,
      "DUPLICATE_ROLE",
    );
  }

  return next(error);
}

export const createRole: RequestHandler = async (req, res, next) => {
  try {
    const { name, description, permissions } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      (description !== undefined && typeof description !== "string") ||
      (permissions !== undefined &&
        (!Array.isArray(permissions) ||
          !permissions.every((key: unknown) => typeof key === "string")))
    ) {
      return apiManager.failure(
        res,
        "A valid name, description, and permissions array are required",
        400,
        "INVALID_ROLE",
      );
    }

    const role = await createRoleService({
      name,
      description,
      permissions,
    });

    return apiManager.success(
      res,
      "Role created successfully",
      role,
      201,
    );
  } catch (error) {
    return handleError(error, res, next);
  }
};

export const getRoles: RequestHandler = async (_req, res, next) => {
  try {
    const roles = await getRolesService();

    return apiManager.success(
      res,
      "Roles fetched successfully",
      roles,
      200,
    );
  } catch (error) {
    return next(error);
  }
};

export const updateRole: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      return apiManager.failure(
        res,
        "Invalid role ID",
        400,
        "INVALID_ROLE_ID",
      );
    }

    if (
      (name !== undefined &&
        (typeof name !== "string" || !name.trim())) ||
      (description !== undefined && typeof description !== "string") ||
      (permissions !== undefined &&
        (!Array.isArray(permissions) ||
          !permissions.every((key: unknown) => typeof key === "string")))
    ) {
      return apiManager.failure(
        res,
        "Invalid role update data",
        400,
        "INVALID_ROLE",
      );
    }

    if (
      name === undefined &&
      description === undefined &&
      permissions === undefined
    ) {
      return apiManager.failure(
        res,
        "Provide at least one field to update",
        400,
        "EMPTY_UPDATE",
      );
    }

    const role = await updateRoleService(id as string, {
      name,
      description,
      permissions,
    });

    return apiManager.success(
      res,
      "Role updated successfully",
      role,
      200,
    );
  } catch (error) {
    return handleError(error, res, next);
  }
};
*/
import { RequestHandler } from "express";
import mongoose from "mongoose";
import { apiManager } from "../utils/apiManager";         
import * as roleService from "../services/roleService";   

export const createRole: RequestHandler = async (req, res, next) => {
  try {
    const projectId = Array.isArray(req.params.projectId)
      ? req.params.projectId[0]
      : req.params.projectId;

    const { name, description, permissions } = req.body;
    const auth = res.locals.auth;

    if (!mongoose.isValidObjectId(projectId)) {
      return apiManager.failure(res, "Invalid project ID", 400, "INVALID_PROJECT_ID");
    }

    if (
      typeof name !== "string" ||
      !name.trim() ||
      (description !== undefined && typeof description !== "string") ||
      (permissions !== undefined &&
        (!Array.isArray(permissions) || !permissions.every((k: unknown) => typeof k === "string")))
    ) {
      return apiManager.failure(
        res,
        "A valid name, description, and permissions array are required",
        400,
        "INVALID_ROLE",
      );
    }

    // SuperAdmin can create for any project.
    // Project Admin can create only for their own projects.
    if (auth.role !== "superadmin") {
      if (!auth.projectIds?.includes(projectId)) {
        return apiManager.failure(res, "You do not have access to this project", 403, "FORBIDDEN");
      }
    }
    const role = await roleService.createRole({
      name,
      description,
      permissions,
      projectId,
      createdBy: auth.userId,
    });

    return apiManager.success(res, "Role created successfully", role, 201);
  } catch (error) {
    next(error);
  }
};


export const assignRoleToUser: RequestHandler = async (req, res, next) => {
  try {
    const projectId = Array.isArray(req.params.projectId)
      ? req.params.projectId[0]
      : req.params.projectId;
    const userId = Array.isArray(req.params.userId)
      ? req.params.userId[0]
      : req.params.userId;

    const { roleId } = req.body;
    const auth = res.locals.auth;

    if (!mongoose.isValidObjectId(projectId) || !mongoose.isValidObjectId(userId)) {
      return apiManager.failure(res, "Invalid project or user ID", 400, "INVALID_ID");
    }

    if (typeof roleId !== "string" || !mongoose.isValidObjectId(roleId)) {
      return apiManager.failure(res, "Valid roleId is required", 400, "INVALID_ROLE_ID");
    }

    if (auth.role !== "superadmin" && !auth.projectIds?.includes(projectId)) {
      return apiManager.failure(res, "You do not have access to this project", 403, "FORBIDDEN");
    }

    const result = await roleService.assignRoleToUser(userId, projectId, roleId);

    return apiManager.success(res, "Role assigned successfully", result);
  } catch (error) {
    next(error);
  }
};

export const getMyRoles: RequestHandler = async (req, res, next) => {
  try {
    const auth = res.locals.auth as { userId: string };

    const roles = await roleService.getMyRoles(auth.userId);

    return apiManager.success(res, "Roles fetched successfully", roles);
  } catch (error) {
    next(error);
  }
};
