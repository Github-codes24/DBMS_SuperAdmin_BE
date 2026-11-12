import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { apiManager } from "../utils/apiManager.js";
import { Types } from "mongoose";
import { httpError } from "../utils/httpError.js";

export const validate = (schema: ZodType): RequestHandler => {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body ?? {},
      params: req.params ?? {},
      query: req.query ?? {},
    });

    if (!result.success) {
      const issueSummary = result.error.issues
        .map((i) => `${i.path.join(".") || "field"}: ${i.message}`)
        .join("; ");
      console.error("Zod Validation Error:", result.error.format());

      return apiManager.failure(
        res,
        `Validation failed: ${issueSummary}`,
        400,
        "VALIDATION_ERROR",
        result.error.issues,
      );
    }

    if (result.data && typeof result.data === "object") {
      const typed = result.data as Record<string, unknown>;
      if (typed.body !== undefined) {
        req.body = typed.body;
      }
    }

    res.locals.validated = result.data;
    next();
  };
};

export const objectIdParams = (...paramNames: string[]): RequestHandler => {
  return (req, _res, next) => {
    for (const name of paramNames) {
      const val = req.params[name];
      const isCustomProjectId = name === "projectId" && typeof val === "string" && /^PID-\d+$/i.test(val);
      if (typeof val !== "string" || (!Types.ObjectId.isValid(val) && !isCustomProjectId)) {
        return next(httpError(400, "INVALID_ID", `Invalid ${name} parameter`));
      }
    }
    next();
  };
};
