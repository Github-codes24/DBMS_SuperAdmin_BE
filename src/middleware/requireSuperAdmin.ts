import { RequestHandler } from "express";
import { httpError } from "../utils/httpError.js";

export const requireSuperAdmin: RequestHandler = (req, _res, next) => {
  if (req.user?.role !== "superadmin") {
    return next(httpError(403, "FORBIDDEN", "Only SuperAdmin can manage roles and permissions"));
  }
  next();
};