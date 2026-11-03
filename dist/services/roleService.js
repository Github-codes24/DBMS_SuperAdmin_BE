"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePermissions = validatePermissions;
exports.createRole = createRole;
exports.getRolesByProject = getRolesByProject;
exports.getRoleById = getRoleById;
exports.updateRole = updateRole;
exports.assignRoleToUser = assignRoleToUser;
const permission_1 = require("../models/permission");
const roles_1 = require("../models/roles");
const mongoose_1 = require("mongoose");
const User_1 = require("../models/User");
async function validatePermissions(keys) {
    if (keys.length === 0)
        return;
    const existing = await permission_1.Permission.find({
        key: { $in: keys.map((k) => k.toLowerCase()) },
    }).select("key");
    const existingKeys = new Set(existing.map((p) => p.key));
    const invalid = keys.filter((k) => !existingKeys.has(k.toLowerCase()));
    if (invalid.length > 0) {
        throw Object.assign(new Error(`Invalid permission keys: ${invalid.join(", ")}`), {
            statusCode: 400,
            code: "INVALID_PERMISSION_KEYS",
        });
    }
}
async function createRole(input) {
    const name = input.name.trim();
    const permissions = [...new Set((input.permissions ?? []).map((p) => p.toLowerCase()))];
    if (permissions.length > 0) {
        await validatePermissions(permissions);
    }
    if (!mongoose_1.Types.ObjectId.isValid(input.projectId)) {
        throw Object.assign(new Error("Invalid projectId"), {
            statusCode: 400,
            code: "INVALID_PROJECT_ID",
        });
    }
    const role = await roles_1.Role.create({
        name,
        description: input.description?.trim() ?? "",
        projectId: input.projectId,
        permissions,
        createdBy: input.createdBy,
    });
    return role;
}
async function getRolesByProject(projectId) {
    return roles_1.Role.find({ projectId, isActive: true }).sort({ name: 1 });
}
async function getRoleById(roleId, projectId) {
    return roles_1.Role.findOne({ _id: roleId, projectId, isActive: true });
}
async function updateRole(roleId, projectId, data) {
    const role = await roles_1.Role.findOne({ _id: roleId, projectId });
    if (!role) {
        throw Object.assign(new Error("Role not found"), { statusCode: 404, code: "ROLE_NOT_FOUND" });
    }
    if (data.name !== undefined)
        role.name = data.name.trim();
    if (data.description !== undefined)
        role.description = data.description.trim();
    if (data.permissions !== undefined) {
        const permissions = [...new Set(data.permissions.map((p) => p.toLowerCase()))];
        await validatePermissions(permissions);
        role.permissions = permissions;
    }
    await role.save();
    return role;
}
async function assignRoleToUser(userId, projectId, roleId) {
    if (!mongoose_1.Types.ObjectId.isValid(roleId)) {
        throw Object.assign(new Error("Invalid roleId"), { statusCode: 400, code: "INVALID_ROLE_ID" });
    }
    const role = await roles_1.Role.findOne({ _id: roleId, projectId, isActive: true });
    if (!role) {
        throw Object.assign(new Error("Role does not belong to this project"), {
            statusCode: 400,
            code: "ROLE_PROJECT_MISMATCH",
        });
    }
    const user = await User_1.User.findById(userId);
    if (!user) {
        throw Object.assign(new Error("User not found"), { statusCode: 404, code: "USER_NOT_FOUND" });
    }
    if (!user.projectIds.includes(projectId)) {
        throw Object.assign(new Error("User does not belong to this project"), {
            statusCode: 400,
            code: "USER_NOT_IN_PROJECT",
        });
    }
    // Remove any existing role for this project, then add the new one
    user.projectRoles = (user.projectRoles || []).filter((pr) => pr.projectId !== projectId);
    user.projectRoles.push({ projectId, roleId: role._id });
    await user.save();
    return {
        userId: user._id,
        projectId,
        roleId: role._id,
        roleName: role.name,
        permissions: role.permissions,
    };
}
//# sourceMappingURL=roleService.js.map