"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRole = createRole;
exports.getRolesByProject = getRolesByProject;
exports.getRoleById = getRoleById;
exports.updateRole = updateRole;
exports.deleteRole = deleteRole;
exports.getMatrix = getMatrix;
exports.savePermissions = savePermissions;
const mongoose_1 = require("mongoose");
const roles_js_1 = require("../models/roles.js");
const permission_js_1 = require("../models/permission.js");
const modules_js_1 = require("../models/modules.js");
const action_js_1 = require("../models/action.js");
const Project_js_1 = require("../models/Project.js");
const User_js_1 = require("../models/User.js");
const httpError_js_1 = require("../utils/httpError.js");
const audit_service_js_1 = require("./audit.service.js");
async function assertProject(projectId) {
    if (!(await Project_js_1.Project.exists({ _id: projectId })))
        throw (0, httpError_js_1.httpError)(404, "PROJECT_NOT_FOUND", "Project not found");
}
async function findRole(projectId, roleId) {
    const role = await roles_js_1.Role.findOne({ _id: roleId, projectId }); // projectId in the filter blocks cross-project access
    if (!role)
        throw (0, httpError_js_1.httpError)(404, "ROLE_NOT_FOUND", "Role not found");
    return role;
}
async function normaliseModuleKeys(projectId, keys) {
    const unique = [...new Set(keys.map((k) => k.toLowerCase()))];
    if (unique.length === 0)
        return unique;
    const n = await modules_js_1.Module.countDocuments({ projectId, key: { $in: unique }, isActive: true });
    if (n !== unique.length)
        throw (0, httpError_js_1.httpError)(400, "INVALID_MODULES", "One or more modules do not exist in this project");
    return unique;
}
async function createRole(projectId, input, actorId) {
    await assertProject(projectId);
    const moduleKeys = await normaliseModuleKeys(projectId, input.moduleKeys ?? []);
    try {
        const role = await roles_js_1.Role.create({
            name: input.name.trim(),
            description: input.description?.trim() ?? "",
            projectId,
            moduleKeys,
            permissions: [], // a new role can do nothing until SuperAdmin ticks boxes
            createdBy: actorId,
        });
        await (0, audit_service_js_1.audit)("role.created", { actorId, projectId, targetId: role._id, after: { name: role.name, moduleKeys } });
        return role;
    }
    catch (e) {
        if ((0, httpError_js_1.isDuplicateKey)(e))
            throw (0, httpError_js_1.httpError)(409, "ROLE_NAME_EXISTS", "A role with this name already exists in this project");
        throw e;
    }
}
async function getRolesByProject(projectId) {
    await assertProject(projectId);
    return roles_js_1.Role.find({ projectId }).sort({ name: 1 }).lean();
}
async function getRoleById(projectId, roleId) {
    return findRole(projectId, roleId);
}
async function updateRole(projectId, roleId, data, actorId) {
    const role = await findRole(projectId, roleId);
    if (role.isSystem)
        throw (0, httpError_js_1.httpError)(403, "ROLE_LOCKED", "System role cannot be modified");
    const $set = {};
    if (data.name !== undefined)
        $set.name = data.name.trim();
    if (data.description !== undefined)
        $set.description = data.description.trim();
    if (data.isActive !== undefined)
        $set.isActive = data.isActive;
    if (data.moduleKeys !== undefined) {
        const moduleKeys = await normaliseModuleKeys(projectId, data.moduleKeys);
        $set.moduleKeys = moduleKeys;
        // modules removed from the role lose their granted permissions too
        $set.permissions = role.permissions.filter((k) => moduleKeys.includes(k.split(":")[0]));
    }
    try {
        const updated = await roles_js_1.Role.findOneAndUpdate({ _id: roleId, projectId }, { $set, $inc: { version: 1 } }, { new: true });
        await (0, audit_service_js_1.audit)("role.updated", { actorId, projectId, targetId: roleId, before: { name: role.name, moduleKeys: role.moduleKeys }, after: $set });
        return updated;
    }
    catch (e) {
        if ((0, httpError_js_1.isDuplicateKey)(e))
            throw (0, httpError_js_1.httpError)(409, "ROLE_NAME_EXISTS", "A role with this name already exists in this project");
        throw e;
    }
}
async function deleteRole(projectId, roleId, actorId) {
    const role = await findRole(projectId, roleId);
    if (role.isSystem)
        throw (0, httpError_js_1.httpError)(403, "ROLE_LOCKED", "System role cannot be deleted");
    const inUse = await User_js_1.User.countDocuments({ "projectRoles.roleId": role._id });
    if (inUse > 0)
        throw (0, httpError_js_1.httpError)(409, "ROLE_IN_USE", `${inUse} user(s) still hold this role. Reassign them or deactivate the role instead.`);
    await role.deleteOne();
    await (0, audit_service_js_1.audit)("role.deleted", { actorId, projectId, targetId: roleId, before: { name: role.name, permissions: role.permissions } });
    return { deleted: true };
}
/** Feeds the Roles & Permissions screen. */
async function getMatrix(projectId, roleId) {
    const role = await findRole(projectId, roleId);
    const platform = await Project_js_1.Project.findOne({ type: "platform" }).select("_id").lean();
    const searchProjectIds = [new mongoose_1.Types.ObjectId(projectId)];
    if (platform && String(platform._id) !== String(projectId)) {
        searchProjectIds.push(platform._id);
    }
    const tenantPermsCount = await permission_js_1.Permission.countDocuments({ projectId, isActive: true });
    const effectiveProjectIds = tenantPermsCount > 0 ? [new mongoose_1.Types.ObjectId(projectId)] : searchProjectIds;
    const moduleFilter = { projectId: { $in: effectiveProjectIds }, isActive: true };
    const permFilter = { projectId: { $in: effectiveProjectIds }, isActive: true };
    if (role.moduleKeys && role.moduleKeys.length > 0) {
        moduleFilter.key = { $in: role.moduleKeys };
        permFilter.moduleKey = { $in: role.moduleKeys };
    }
    const [actions, rawModules, perms] = await Promise.all([
        action_js_1.Action.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
        modules_js_1.Module.find(moduleFilter).sort({ sortOrder: 1 }).lean(),
        permission_js_1.Permission.find(permFilter).lean(),
    ]);
    let modules = rawModules;
    if (modules.length === 0 && perms.length > 0) {
        const distinctModules = [...new Set(perms.map((p) => p.moduleKey))];
        modules = distinctModules.map((k) => ({
            _id: new mongoose_1.Types.ObjectId(),
            projectId: effectiveProjectIds[0],
            key: k,
            name: k.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            description: "",
            sortOrder: 0,
            isActive: true,
        }));
    }
    const granted = new Set(role.permissions);
    const usedActions = new Set(perms.map((p) => p.actionKey));
    return {
        roleId: role._id,
        roleName: role.name,
        roleVersion: role.version,
        locked: role.isSystem, // the UI disables boxes and Save when true
        actions: actions.filter((a) => usedActions.has(a.key)).map((a) => ({ key: a.key, label: a.label })),
        modules: modules.map((m) => {
            const mine = perms.filter((p) => p.moduleKey === m.key);
            return {
                key: m.key,
                name: m.name,
                description: m.description,
                allowed: mine.map((p) => p.actionKey),
                granted: role.isSystem ? mine.map((p) => p.actionKey) : mine.filter((p) => granted.has(p.key)).map((p) => p.actionKey),
            };
        }),
    };
}
/** Save Permissions: replaces the whole permission set of the role. */
async function savePermissions(projectId, roleId, keys, expectedVersion, actorId) {
    const role = await findRole(projectId, roleId);
    if (role.isSystem)
        throw (0, httpError_js_1.httpError)(403, "ROLE_LOCKED", "System role cannot be modified");
    if (role.version !== expectedVersion)
        throw (0, httpError_js_1.httpError)(409, "VERSION_CONFLICT", "This role was changed elsewhere. Reload and try again.");
    const platform = await Project_js_1.Project.findOne({ type: "platform" }).select("_id").lean();
    const searchProjectIds = [new mongoose_1.Types.ObjectId(projectId)];
    if (platform && String(platform._id) !== String(projectId)) {
        searchProjectIds.push(platform._id);
    }
    // Everything grantable: active permissions for this project, platform fallback, or global
    const grantable = await permission_js_1.Permission.find({
        $or: [
            { projectId: { $in: searchProjectIds } },
            { projectId: { $exists: false } },
        ],
        isActive: true,
    }).select("key moduleKey").lean();
    const valid = new Set(grantable.map((p) => p.key.toLowerCase()));
    const wanted = new Set(keys.map((k) => k.toLowerCase()));
    const invalid = [...wanted].filter((k) => !valid.has(k));
    if (invalid.length)
        throw (0, httpError_js_1.httpError)(400, "INVALID_PERMISSION_KEYS", `Not grantable for this role: ${invalid.join(", ")}`);
    for (const k of [...wanted]) { // View is the base permission
        const [mod, act] = k.split(":");
        if (act !== "view" && valid.has(`${mod}:view`))
            wanted.add(`${mod}:view`);
    }
    const final = [...wanted].sort();
    // Derive and sync moduleKeys from granted permissions so role.moduleKeys reflects granted access
    const grantedModuleKeys = [...new Set(final.map((k) => k.split(":")[0]))];
    const updatedModuleKeys = [...new Set([...(role.moduleKeys ?? []), ...grantedModuleKeys])];
    const res = await roles_js_1.Role.updateOne({ _id: roleId, projectId, version: expectedVersion }, { $set: { permissions: final, moduleKeys: updatedModuleKeys }, $inc: { version: 1 } });
    if (res.matchedCount === 0)
        throw (0, httpError_js_1.httpError)(409, "VERSION_CONFLICT", "This role was changed elsewhere. Reload and try again.");
    await (0, audit_service_js_1.audit)("role.permissions.updated", { actorId, projectId, targetId: roleId, before: role.permissions, after: final });
    return { version: expectedVersion + 1, count: final.length, permissions: final };
}
//# sourceMappingURL=roleService.js.map