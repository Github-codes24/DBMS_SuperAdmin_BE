"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objectIdParams = exports.validate = void 0;
const apiManager_js_1 = require("../utils/apiManager.js");
const mongoose_1 = require("mongoose");
const httpError_js_1 = require("../utils/httpError.js");
const validate = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse({
            body: req.body ?? {},
            params: req.params ?? {},
            query: req.query ?? {},
        });
        if (!result.success) {
<<<<<<< HEAD
            // Helpful for debugging in your terminal:
            console.error("Zod Validation Error:", result.error.format());
            const details = result.error.issues.map((issue) => ({
                field: issue.path.length > 1 ? issue.path.slice(1).join(".") : issue.path.join("."),
                message: issue.message,
                code: issue.code,
            }));
            return apiManager_js_1.apiManager.failure(res, "Request validation failed", 400, "VALIDATION_ERROR", details);
=======
            const issueSummary = result.error.issues
                .map((i) => `${i.path.join(".") || "field"}: ${i.message}`)
                .join("; ");
            console.error("Zod Validation Error:", result.error.format());
            return apiManager_js_1.apiManager.failure(res, `Validation failed: ${issueSummary}`, 400, "VALIDATION_ERROR", result.error.issues);
        }
        if (result.data && typeof result.data === "object") {
            const typed = result.data;
            if (typed.body !== undefined) {
                req.body = typed.body;
            }
>>>>>>> develop
        }
        res.locals.validated = result.data;
        next();
    };
};
exports.validate = validate;
const objectIdParams = (...paramNames) => {
    return (req, _res, next) => {
        for (const name of paramNames) {
            const val = req.params[name];
            const isCustomProjectId = name === "projectId" && typeof val === "string" && /^PID-\d+$/i.test(val);
            if (typeof val !== "string" || (!mongoose_1.Types.ObjectId.isValid(val) && !isCustomProjectId)) {
                return next((0, httpError_js_1.httpError)(400, "INVALID_ID", `Invalid ${name} parameter`));
            }
        }
        next();
    };
};
exports.objectIdParams = objectIdParams;
//# sourceMappingURL=validate.js.map