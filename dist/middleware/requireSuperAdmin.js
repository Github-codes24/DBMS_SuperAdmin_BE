"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSuperAdmin = void 0;
const apiManager_js_1 = require("../utils/apiManager.js");
const requireSuperAdmin = (_req, res, next) => {
    const auth = res.locals.auth;
    if (auth?.role !== "superadmin") {
        return apiManager_js_1.apiManager.failure(res, "Only SuperAdmin can manage roles and permissions", 403, "FORBIDDEN");
    }
    next();
};
exports.requireSuperAdmin = requireSuperAdmin;
//# sourceMappingURL=requireSuperAdmin.js.map