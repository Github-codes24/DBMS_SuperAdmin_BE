
import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { apiManager } from "../utils/apiManager.js";
import { Types } from "mongoose";
import { httpError } from "../utils/httpError.js";

// export const validate = (schema: ZodType): RequestHandler => {
//   return (req, res, next) => {
//     const result = schema.safeParse({
//       body: req.body,
//       params: req.params,
//       query: req.query,
//     });

//     if (!result.success) {
//       return apiManager.failure(
//         res,
//         "Request validation failed",
//         400,
//         "VALIDATION_ERROR",
//       );
//     }

//     res.locals.validated = result.data;
//     next();
//   };
// };

// export const validate = (schema: ZodSchema): RequestHandler => (req, res, next) => {
//   const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });

//   if (!result.success) {
//     console.warn("[Validation]", req.method, req.originalUrl, JSON.stringify(result.error.issues));
//     return apiManager.failure(res, "Request validation failed", 400, "VALIDATION_ERROR");   // return is the key
//   }

//   // Express 5: req.query is read-only, so redefine it instead of assigning
//   const data = result.data as { body?: unknown; params?: unknown; query?: unknown };
//   if (data.body !== undefined) req.body = data.body;
//   if (data.query !== undefined) {
//     Object.defineProperty(req, "query", { value: data.query, writable: true, configurable: true });
//   }

//   return next();
// };

export const validate = (schema: ZodType): RequestHandler => {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body ?? {},
      params: req.params ?? {},
      query: req.query ?? {},
    });

    if (!result.success) {
      // Helpful for debugging in your terminal:
      console.error("Zod Validation Error:", result.error.format());

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