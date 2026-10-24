
import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { apiManager } from "../utils/apiManager.js";

export const validate = (schema: ZodType): RequestHandler => {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      return apiManager.failure(
        res,
        "Request validation failed",
        400,
        "VALIDATION_ERROR",
      );
    }

    res.locals.validated = result.data;
    next();
  };
};
