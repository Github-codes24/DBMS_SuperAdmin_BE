"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectUser = createProjectUser;
exports.assignRoleToUser = assignRoleToUser;
exports.setProjectAccess = setProjectAccess;
exports.setUserActive = setUserActive;
exports.getMyRoles = getMyRoles;
exports.getProjectUsers = getProjectUsers;
exports.listProjectAdmins = listProjectAdmins;
exports.createPlatformAdmin = createPlatformAdmin;
exports.updatePlatformAdmin = updatePlatformAdmin;
exports.deletePlatformAdmin = deletePlatformAdmin;
const mongoose_1 = require("mongoose");
const node_crypto_1 = require("node:crypto");
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
/** List all users assigned to a project along with their project role. */
async function getProjectUsers(projectId) {
    const project = await Project_js_1.Project.findById(projectId);
    if (!project)
        throw (0, httpError_js_1.httpError)(404, "PROJECT_NOT_FOUND", "Project not found");
    const users = await User_js_1.User.find({
        "projectRoles.projectId": project._id,
    })
        .select("name email role projectRoles isActive lastLoginAt createdAt")
        .lean();
    const roleIds = users.flatMap((u) => (u.projectRoles || [])
        .filter((pr) => String(pr.projectId) === String(project._id))
        .map((pr) => pr.roleId));
    const roles = await roles_js_1.Role.find({ _id: { $in: roleIds } })
        .select("name permissions")
        .lean();
    const roleMap = new Map(roles.map((r) => [String(r._id), r]));
    return users.map((u) => {
        const pr = (u.projectRoles || []).find((p) => String(p.projectId) === String(project._id));
        const roleInfo = pr ? roleMap.get(String(pr.roleId)) : null;
        return {
            _id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            projectRole: {
                roleId: pr?.roleId ?? null,
                roleName: roleInfo?.name ?? null,
                isActive: pr?.isActive ?? true,
            },
            isActive: u.isActive,
            lastLoginAt: u.lastLoginAt,
            createdAt: u.createdAt,
        };
    });
}
/** List all Project Admins for dropdowns and admin management */
async function listProjectAdmins() {
    const users = await User_js_1.User.find({
        $or: [{ role: "admin" }, { "projectRoles.0": { $exists: true } }],
        role: { $ne: "superadmin" },
    })
        .select("name email phone username role isActive projectRoles createdAt")
        .lean();
    const allProjects = await Project_js_1.Project.find({ type: "tenant" })
        .select("_id projectId name adminId")
        .lean();
    return users.map((u) => {
        const assignedProjects = allProjects.filter((p) => String(p.adminId) === String(u._id) ||
            (u.projectRoles || []).some((pr) => String(pr.projectId) === String(p._id)));
        return {
            _id: u._id,
            id: String(u._id),
            name: u.name,
            fullName: u.name,
            email: u.email,
            phone: u.phone || "",
            username: u.username || "",
            role: u.role,
            status: u.isActive ? "active" : "inactive",
            isActive: u.isActive,
            projects: assignedProjects.map((p) => ({
                _id: p._id,
                id: String(p._id),
                projectId: p.projectId,
                name: p.name,
            })),
            projectIds: assignedProjects.map((p) => String(p._id)),
            createdAt: u.createdAt,
        };
    });
}
/** Create a new Project Admin from the Add Project Admin modal */
async function createPlatformAdmin(input, actorId) {
    const name = (input.name || input.fullName || "").trim();
    if (!name)
        throw (0, httpError_js_1.httpError)(400, "NAME_REQUIRED", "Full name is required");
    const email = input.email.trim().toLowerCase();
    const phone = (input.phone || "").trim();
    const username = (input.username || "").trim();
    const isActive = input.isActive !== undefined
        ? Boolean(input.isActive)
        : input.status
            ? input.status.toLowerCase() === "active"
            : true;
    const rawPassword = input.password && input.password.length >= 8
        ? input.password
        : (0, node_crypto_1.randomBytes)(16).toString("hex");
    const passwordHash = await (0, password_js_1.hashPassword)(rawPassword);
    const projectInput = input.projects || [];
    const resolvedProjects = await Project_js_1.Project.find({
        $or: [
            { _id: { $in: projectInput.filter((id) => mongoose_1.Types.ObjectId.isValid(id)) } },
            { projectId: { $in: projectInput } },
            { name: { $in: projectInput } },
        ],
    });
    const existing = await User_js_1.User.findOne({ email });
    if (existing) {
        if (existing.role === "superadmin") {
            throw (0, httpError_js_1.httpError)(400, "NOT_ALLOWED", "Cannot make a superadmin a project admin");
        }
        existing.name = name;
        existing.phone = phone;
        existing.username = username;
        existing.role = "admin";
        existing.isActive = isActive;
        for (const p of resolvedProjects) {
            if (!existing.projectRoles.some((pr) => String(pr.projectId) === String(p._id))) {
                existing.projectRoles.push({
                    projectId: p._id,
                    roleId: undefined,
                    isActive: true,
                    assignedBy: actorId,
                });
            }
            if (!p.adminId) {
                await Project_js_1.Project.updateOne({ _id: p._id }, { $set: { adminId: existing._id } });
            }
        }
        await existing.save();
        return {
            _id: existing._id,
            id: String(existing._id),
            name: existing.name,
            fullName: existing.name,
            email: existing.email,
            phone,
            username,
            status: existing.isActive ? "active" : "inactive",
            isActive: existing.isActive,
            projectIds: resolvedProjects.map((p) => String(p._id)),
        };
    }
    try {
        const user = await User_js_1.User.create({
            name,
            email,
            phone,
            username,
            passwordHash,
            role: "admin",
            isActive,
            projectRoles: resolvedProjects.map((p) => ({
                projectId: p._id,
                isActive: true,
                assignedBy: actorId,
            })),
        });
        for (const p of resolvedProjects) {
            await Project_js_1.Project.updateOne({ _id: p._id }, { $set: { adminId: user._id } });
        }
        await (0, audit_service_js_1.audit)("admin.created", { actorId, targetId: user._id, after: { email, name } });
        return {
            _id: user._id,
            id: String(user._id),
            name: user.name,
            fullName: user.name,
            email: user.email,
            phone,
            username,
            status: user.isActive ? "active" : "inactive",
            isActive: user.isActive,
            projectIds: resolvedProjects.map((p) => String(p._id)),
        };
    }
    catch (e) {
        if ((0, httpError_js_1.isDuplicateKey)(e))
            throw (0, httpError_js_1.httpError)(409, "EMAIL_EXISTS", "A user with this email already exists");
        throw e;
    }
}
/** Update an existing Project Admin */
async function updatePlatformAdmin(adminId, input, actorId) {
    const user = await User_js_1.User.findById(adminId);
    if (!user)
        throw (0, httpError_js_1.httpError)(404, "USER_NOT_FOUND", "Project Admin not found");
    if (user.role === "superadmin")
        throw (0, httpError_js_1.httpError)(403, "NOT_ALLOWED", "Cannot edit superadmin");
    if (input.name || input.fullName)
        user.name = (input.name || input.fullName).trim();
    if (input.email)
        user.email = input.email.trim().toLowerCase();
    if (input.phone !== undefined)
        user.phone = input.phone.trim();
    if (input.username !== undefined)
        user.username = input.username.trim();
    if (input.status !== undefined)
        user.isActive = input.status.toLowerCase() === "active";
    if (input.isActive !== undefined)
        user.isActive = Boolean(input.isActive);
    if (input.projects !== undefined) {
        const resolvedProjects = await Project_js_1.Project.find({
            $or: [
                { _id: { $in: input.projects.filter((id) => mongoose_1.Types.ObjectId.isValid(id)) } },
                { projectId: { $in: input.projects } },
                { name: { $in: input.projects } },
            ],
        });
        user.projectRoles = resolvedProjects.map((p) => ({
            projectId: p._id,
            isActive: true,
            assignedBy: actorId,
        }));
        await Project_js_1.Project.updateMany({ adminId: user._id }, { $set: { adminId: null } });
        if (resolvedProjects.length > 0) {
            await Project_js_1.Project.updateMany({ _id: { $in: resolvedProjects.map((p) => p._id) } }, { $set: { adminId: user._id } });
        }
    }
    await user.save();
    await (0, audit_service_js_1.audit)("admin.updated", { actorId, targetId: user._id, after: input });
    return {
        _id: user._id,
        id: String(user._id),
        name: user.name,
        fullName: user.name,
        email: user.email,
        phone: user.phone || "",
        username: user.username || "",
        status: user.isActive ? "active" : "inactive",
        isActive: user.isActive,
    };
}
/** Delete a Project Admin */
async function deletePlatformAdmin(adminId, actorId) {
    const user = await User_js_1.User.findById(adminId);
    if (!user)
        throw (0, httpError_js_1.httpError)(404, "USER_NOT_FOUND", "Project Admin not found");
    if (user.role === "superadmin")
        throw (0, httpError_js_1.httpError)(403, "NOT_ALLOWED", "Super admin cannot be deleted");
    await Project_js_1.Project.updateMany({ adminId: user._id }, { $set: { adminId: null } });
    await User_js_1.User.deleteOne({ _id: user._id });
    await (0, audit_service_js_1.audit)("admin.deleted", { actorId, targetId: user._id, after: { name: user.name } });
    return { id: adminId, name: user.name };
}
//# sourceMappingURL=projectAdminService.js.map