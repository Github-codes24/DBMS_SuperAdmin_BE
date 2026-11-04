"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectUser = createProjectUser;
exports.assignRoleToUser = assignRoleToUser;
exports.setProjectAccess = setProjectAccess;
exports.setUserActive = setUserActive;
exports.getMyRoles = getMyRoles;
const User_js_1 = require("../models/User.js");
const Project_js_1 = require("../models/Project.js");
const roles_js_1 = require("../models/roles.js");
const password_js_1 = require("../utils/password.js");
const httpError_js_1 = require("../utils/httpError.js");
const audit_service_js_1 = require("./audit.service.js");
async function createProjectUser(input, actorId) {
    const project = await Project_js_1.Project.findById(input.projectId);
    if (!project)
        throw (0, httpError_js_1.httpError)(404, "PROJECT_NOT_FOUND", "Project not found");
    // The role must belong to THIS project (blocks attaching "LTS Admin" under another project)
    const role = await roles_js_1.Role.findOne({ _id: input.roleId, projectId: input.projectId, isActive: true });
    if (!role)
        throw (0, httpError_js_1.httpError)(400, "ROLE_PROJECT_MISMATCH", "Role does not belong to this project");
    if (role.isSystem)
        throw (0, httpError_js_1.httpError)(400, "ROLE_LOCKED", "System role cannot be assigned");
    const email = input.email.trim().toLowerCase();
    const entry = { projectId: project._id, roleId: role._id, isActive: true, assignedBy: actorId };
    const existing = await User_js_1.User.findOne({ email });
    // Same person, another project: just add the project role (password in the request is ignored)
    if (existing) {
        if (existing.role === "superadmin")
            throw (0, httpError_js_1.httpError)(400, "NOT_ALLOWED", "Cannot attach a project role to a super admin");
        const res = await User_js_1.User.updateOne({ _id: existing._id, "projectRoles.projectId": { $ne: project._id } }, { $push: { projectRoles: entry } });
        if (res.modifiedCount === 0)
            throw (0, httpError_js_1.httpError)(409, "USER_ALREADY_IN_PROJECT", "User already has a role in this project");
        await (0, audit_service_js_1.audit)("user.project_role.added", { actorId, projectId: project._id, targetId: existing._id, after: { roleId: role._id } });
        return { id: String(existing._id), name: existing.name, email, projectId: project._id, roleId: role._id, roleName: role.name, created: false };
    }
    try {
        const user = await User_js_1.User.create({
            name: input.name.trim(),
            email,
            passwordHash: await (0, password_js_1.hashPassword)(input.password),
            role: "user",
            projectRoles: [entry],
            isActive: true,
        });
        await (0, audit_service_js_1.audit)("user.created", { actorId, projectId: project._id, targetId: user._id, after: { email, roleId: role._id } });
        return { id: String(user._id), name: user.name, email, projectId: project._id, roleId: role._id, roleName: role.name, created: true };
    }
    catch (e) {
        if ((0, httpError_js_1.isDuplicateKey)(e))
            throw (0, httpError_js_1.httpError)(409, "EMAIL_EXISTS", "A user with this email already exists");
        throw e;
    }
}
/** Change the role of a user who is already in the project. */
async function assignRoleToUser(projectId, userId, roleId, actorId) {
    const role = await roles_js_1.Role.findOne({ _id: roleId, projectId, isActive: true });
    if (!role)
        throw (0, httpError_js_1.httpError)(400, "ROLE_PROJECT_MISMATCH", "Role does not belong to this project");
    if (role.isSystem)
        throw (0, httpError_js_1.httpError)(400, "ROLE_LOCKED", "System role cannot be assigned");
    const res = await User_js_1.User.updateOne({ _id: userId, role: "user", "projectRoles.projectId": projectId }, { $set: { "projectRoles.$.roleId": role._id, "projectRoles.$.assignedBy": actorId, "projectRoles.$.isActive": true } });
    if (res.matchedCount === 0)
        throw (0, httpError_js_1.httpError)(404, "USER_NOT_IN_PROJECT", "User not found in this project");
    await (0, audit_service_js_1.audit)("user.role.changed", { actorId, projectId, targetId: userId, after: { roleId: role._id } });
    return { userId, projectId, roleId: role._id, roleName: role.name, permissions: role.permissions };
}
/** SuperAdmin suspends or restores one user's access to one project. Effective on the next request. */
async function setProjectAccess(projectId, userId, isActive, actorId) {
    const res = await User_js_1.User.updateOne({ _id: userId, "projectRoles.projectId": projectId }, { $set: { "projectRoles.$.isActive": isActive } });
    if (res.matchedCount === 0)
        throw (0, httpError_js_1.httpError)(404, "USER_NOT_IN_PROJECT", "User not found in this project");
    await (0, audit_service_js_1.audit)(isActive ? "user.project_access.restored" : "user.project_access.revoked", { actorId, projectId, targetId: userId });
    return { userId, projectId, isActive };
}
/** Block or unblock the whole account. Blocking also logs the user out everywhere. */
async function setUserActive(userId, isActive, actorId) {
    const user = await User_js_1.User.findById(userId);
    if (!user)
        throw (0, httpError_js_1.httpError)(404, "USER_NOT_FOUND", "User not found");
    if (user.role === "superadmin")
        throw (0, httpError_js_1.httpError)(403, "NOT_ALLOWED", "Super admin cannot be blocked");
    user.isActive = isActive;
    if (!isActive)
        user.tokenVersion += 1;
    await user.save();
    await (0, audit_service_js_1.audit)(isActive ? "user.unblocked" : "user.blocked", { actorId, targetId: userId });
    return { userId, isActive };
}
async function getMyRoles(userId) {
    const user = await User_js_1.User.findById(userId).select("projectRoles");
    if (!user)
        throw (0, httpError_js_1.httpError)(404, "USER_NOT_FOUND", "User not found");
    const active = user.projectRoles.filter((pr) => pr.isActive);
    const roles = await roles_js_1.Role.find({ _id: { $in: active.map((pr) => pr.roleId) }, isActive: true }).select("name permissions").lean();
    return active.map((pr) => {
        const r = roles.find((x) => String(x._id) === String(pr.roleId));
        return { projectId: pr.projectId, roleId: pr.roleId, roleName: r?.name ?? null, permissions: r?.permissions ?? [] };
    });
}
//# sourceMappingURL=projectAdminService.js.map