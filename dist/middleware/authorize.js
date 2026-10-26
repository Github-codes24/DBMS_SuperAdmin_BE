"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const apiManager_js_1 = require("../utils/apiManager.js");
const authorize = (...allowedRoles) => {
    return (_req, res, next) => {
        const auth = res.locals.auth;
        if (!auth || !auth.role) {
            return apiManager_js_1.apiManager.failure(res, "Authentication required", 401, "AUTHENTICATION_REQUIRED");
        }
        if (!allowedRoles.includes(auth.role)) {
            return apiManager_js_1.apiManager.failure(res, "You do not have permission to access this resource", 403, "FORBIDDEN");
        }
        return next();
    };
};
exports.authorize = authorize;
//# sourceMappingURL=authorize.js.map