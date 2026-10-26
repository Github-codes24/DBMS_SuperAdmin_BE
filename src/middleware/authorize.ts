import type { RequestHandler } from "express";
import { apiManager } from "../utils/apiManager.js";

export const authorize = (...allowedRoles: string[]): RequestHandler => {
  return (_req, res, next) => {
    const auth = res.locals.auth as
      | { userId?: string; role?: string; projectIds?: string[] }
      | undefined;

    if (!auth || !auth.role) {
      return apiManager.failure(
        res,
        "Authentication required",
        401,
        "AUTHENTICATION_REQUIRED",
      );
    }

    if (!allowedRoles.includes(auth.role)) {
      return apiManager.failure(
        res,
        "You do not have permission to access this resource",
        403,
        "FORBIDDEN",
      );
    }

    return next();
  };
};
