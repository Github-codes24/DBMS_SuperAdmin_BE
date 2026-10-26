"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const apiManager_js_1 = require("../utils/apiManager.js");
const validate = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse({
            body: req.body,
            params: req.params,
            query: req.query,
        });
        if (!result.success) {
            return apiManager_js_1.apiManager.failure(res, "Request validation failed", 400, "VALIDATION_ERROR");
        }
        res.locals.validated = result.data;
        next();
    };
};
exports.validate = validate;
//# sourceMappingURL=validate.js.map