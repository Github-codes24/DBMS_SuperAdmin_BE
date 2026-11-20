"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizePermission = void 0;
const mongoose_1 = require("mongoose");
const User_js_1 = require("../models/User.js");
const roles_js_1 = require("../models/roles.js");
const norm = (s) => s.trim().toLowerCase().replace(/[\s_-]/g, "");
const authorizePermission = (moduleKey, actionKey) => async (req, res, next) => {
    try {
        const auth = res.locals.auth;
        if (!auth?.userId || !auth.role)
            return res.status(401).json({ success: false, message: "Authentication required" });
        if (norm(auth.role) === "superadmin")
            return next();
        const projectId = String(req.header("X-Project-Id") || "").trim();
        if (!mongoose_1.Types.ObjectId.isValid(projectId))
            return res.status(400).json({ success: false, message: "Valid X-Project-Id header required" });
        // Find the user, but only if they have an ACTIVE entry for this project
        const user = await User_js_1.User.findOne({
            _id: auth.userId,
            isActive: true, // the user account itself is active
            projectRoles: {
                $elemMatch: { projectId: new mongoose_1.Types.ObjectId(projectId), isActive: true },
            },
        })
            .select("projectRoles")
            .lean();
        // Pick the matching entry to get this project's roleId
        const entry = user?.projectRoles?.find((pr) => String(pr.projectId) === projectId && pr.isActive);
        const role = entry?.roleId
            ? await roles_js_1.Role.findOne({
                _id: entry.roleId,
                projectId: new mongoose_1.Types.ObjectId(projectId),
                isActive: { $ne: false },
            })
                .select("permissions")
                .lean()
            : null;
        const needed = `${moduleKey}:${actionKey}`;
        if (!role || !(role.permissions ?? []).includes(needed))
            return res.status(403).json({ success: false, message: `Forbidden: missing permission ${needed}` });
        return next();
    }
    catch (e) {
        return next(e);
    }
};
exports.authorizePermission = authorizePermission;
//# sourceMappingURL=%20authorizePermission.js.map