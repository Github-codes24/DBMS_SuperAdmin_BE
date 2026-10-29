
import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { createProjectAdmin } from "../services/projectAdminService.js";
import { apiManager } from "../utils/apiManager.js";

export const createProjectAdminController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    // const projectId = req.params.projectId;
    const projectId = Array.isArray(req.params.projectId)
  ? req.params.projectId[0]
  : req.params.projectId;

    const { name, email, password } = req.body;

    if (!mongoose.isValidObjectId(projectId)) {
      return apiManager.failure(
        res,
        "Invalid project ID",
        400,
        "INVALID_PROJECT_ID",
      );
    }
// validation of the req body 
    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return apiManager.failure(
        res,
        "Valid name, email, and password (at least 8 characters) are required",
        400,
        "INVALID_PROJECT_ADMIN",
      );
    }

    const admin = await createProjectAdmin({
      projectId,
      name,
      email,
      password,
    });

    return apiManager.success(
      res,
      "Project Admin created successfully",
      admin,
      201,
    );
  } catch (error) {
    next(error);
  }
};
