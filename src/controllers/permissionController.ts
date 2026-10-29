
import type { RequestHandler } from "express";
import {
  createPermission as createPermissionService,
  getPermissions as getPermissionsService,
} from "../services/permissionService.js";
import { apiManager } from "../utils/apiManager.js";

export const createPermission: RequestHandler = async (req, res, next) => {
  try {
    const { name, key, description } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof key !== "string" ||
      !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/i.test(key.trim()) ||
      (description !== undefined && typeof description !== "string")
    ) {
      return apiManager.failure(
        res,
        "Valid name, key, and description are required",
        400,
        "INVALID_PERMISSION",
      );
    }

    const permission = await createPermissionService({
      name,
      key,
      description,
    });

    return apiManager.success(
      res,
      "Permission created successfully",
      permission,
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
        "Permission name or key already exists",
        409,
        "DUPLICATE_PERMISSION",
      );
    }

    next(error);
  }
};

export const getPermissions: RequestHandler = async (_req, res, next) => {
  try {
    const permissions = await getPermissionsService();

    return apiManager.success(
      res,
      "Permissions fetched successfully",
      permissions,
      200,
    );
  } catch (error) {
    next(error);
  }
};
