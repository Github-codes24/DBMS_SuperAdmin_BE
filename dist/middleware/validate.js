"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objectIdParams = exports.validate = void 0;
const apiManager_js_1 = require("../utils/apiManager.js");
const mongoose_1 = require("mongoose");
const httpError_js_1 = require("../utils/httpError.js");
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
const validate = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse({
            body: req.body ?? {},
            params: req.params ?? {},
            query: req.query ?? {},
        });
        if (!result.success) {
            // Helpful for debugging in your terminal:
            console.error("Zod Validation Error:", result.error.format());
            const details = result.error.issues.map((issue) => ({
                field: issue.path.length > 1 ? issue.path.slice(1).join(".") : issue.path.join("."),
                message: issue.message,
                code: issue.code,
            }));
            return apiManager_js_1.apiManager.failure(res, "Request validation failed", 400, "VALIDATION_ERROR", details);
        }
        res.locals.validated = result.data;
        next();
    };
};
exports.validate = validate;
const objectIdParams = (...names) => (req, _res, next) => {
    for (const n of names) {
        const v = req.params[n];
        const s = Array.isArray(v) ? v[0] : v;
        if (!s || !mongoose_1.Types.ObjectId.isValid(s))
            return next((0, httpError_js_1.httpError)(400, "INVALID_ID", `Invalid ${n}`));
    }
    next();
};
exports.objectIdParams = objectIdParams;
//# sourceMappingURL=validate.js.map