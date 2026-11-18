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

    const cleanAuthRole = auth.role.trim().toLowerCase().replace(/[\s-_]/g, "");
    const cleanAllowed = allowedRoles.map((r) => r.trim().toLowerCase().replace(/[\s-_]/g, ""));

    if (!cleanAllowed.includes(cleanAuthRole) && !allowedRoles.includes(auth.role)) {
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
