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
            if (typeof val !== "string" || !mongoose_1.Types.ObjectId.isValid(val)) {
                return next((0, httpError_js_1.httpError)(400, "INVALID_ID", `Invalid ${name} parameter`));
            }
        }
        next();
    };
};
exports.objectIdParams = objectIdParams;
//# sourceMappingURL=validate.js.map