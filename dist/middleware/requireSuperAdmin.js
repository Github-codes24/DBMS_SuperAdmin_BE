"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSuperAdmin = void 0;
const httpError_js_1 = require("../utils/httpError.js");
const requireSuperAdmin = (req, _res, next) => {
    const role = req.user?.role?.trim().toLowerCase().replace(/[\s-_]/g, "");
    if (role !== "superadmin") {
        return next((0, httpError_js_1.httpError)(403, "FORBIDDEN", "Only SuperAdmin can manage roles and permissions"));
    }
    next();
};
exports.requireSuperAdmin = requireSuperAdmin;
//# sourceMappingURL=requireSuperAdmin.js.map