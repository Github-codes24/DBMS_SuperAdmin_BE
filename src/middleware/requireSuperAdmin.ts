
import type { RequestHandler } from "express";
import { apiManager } from "../utils/apiManager.js";

export const requireSuperAdmin: RequestHandler = (_req, res, next) => {
  const auth = res.locals.auth as { role?: string } | undefined;

  if (auth?.role !== "superadmin") {
    return apiManager.failure(
      res,
      "Only SuperAdmin can manage roles and permissions",
      403,
      "FORBIDDEN",
    );
  }

  next();
};
