import { RequestHandler } from "express";
import { httpError } from "../utils/httpError.js";

export const requireSuperAdmin: RequestHandler = (req, _res, next) => {
  const role = req.user?.role?.trim().toLowerCase().replace(/[\s-_]/g, "");
  if (role !== "superadmin") {
    return next(httpError(403, "FORBIDDEN", "Only SuperAdmin can manage roles and permissions"));
  }
  next();
};