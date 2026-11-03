import { Types } from "mongoose";
import { Role } from "../models/roles.js";
import { Permission } from "../models/permission.js";
import { Module } from "../models/modules.js"
import { Action } from "../models/action.js"
import { Project } from "../models/Project.js";
import { User } from "../models/User.js";
import { httpError, isDuplicateKey } from "../utils/httpError.js";
import { audit } from "./audit.service.js";

async function assertProject(projectId: string) {
  if (!(await Project.exists({ _id: projectId }))) throw httpError(404, "PROJECT_NOT_FOUND", "Project not found");
}

async function findRole(projectId: string, roleId: string) {
  const role = await Role.findOne({ _id: roleId, projectId });   // projectId in the filter blocks cross-project access
  if (!role) throw httpError(404, "ROLE_NOT_FOUND", "Role not found");
  return role;
}

async function normaliseModuleKeys(projectId: string, keys: string[]) {
  const unique = [...new Set(keys.map((k) => k.toLowerCase()))];
  if (unique.length === 0) return unique;
  const n = await Module.countDocuments({ projectId, key: { $in: unique }, isActive: true });
  if (n !== unique.length) throw httpError(400, "INVALID_MODULES", "One or more modules do not exist in this project");
  return unique;
}

export async function createRole(
  projectId: string,
  input: { name: string; description?: string; moduleKeys?: string[] },
  actorId: string,
) {
  await assertProject(projectId);
  const moduleKeys = await normaliseModuleKeys(projectId, input.moduleKeys ?? []);
  try {
    const role = await Role.create({
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      projectId,
      moduleKeys,
      permissions: [],            // a new role can do nothing until SuperAdmin ticks boxes
      createdBy: actorId,
    });
    await audit("role.created", { actorId, projectId, targetId: role._id, after: { name: role.name, moduleKeys } });
    return role;
  } catch (e) {
    if (isDuplicateKey(e)) throw httpError(409, "ROLE_NAME_EXISTS", "A role with this name already exists in this project");
    throw e;
  }
}

export async function getRolesByProject(projectId: string) {
  await assertProject(projectId);
  return Role.find({ projectId }).sort({ name: 1 }).lean();
}

export async function getRoleById(projectId: string, roleId: string) {
  return findRole(projectId, roleId);
}

export async function updateRole(
  projectId: string,
  roleId: string,
  data: { name?: string; description?: string; moduleKeys?: string[]; isActive?: boolean },
  actorId: string,
) {
  const role = await findRole(projectId, roleId);
  if (role.isSystem) throw httpError(403, "ROLE_LOCKED", "System role cannot be modified");

  const $set: Record<string, unknown> = {};
  if (data.name !== undefined) $set.name = data.name.trim();
  if (data.description !== undefined) $set.description = data.description.trim();
  if (data.isActive !== undefined) $set.isActive = data.isActive;

  if (data.moduleKeys !== undefined) {
    const moduleKeys = await normaliseModuleKeys(projectId, data.moduleKeys);
    $set.moduleKeys = moduleKeys;
    // modules removed from the role lose their granted permissions too
    $set.permissions = role.permissions.filter((k) => moduleKeys.includes(k.split(":")[0]));
  }

  try {
    const updated = await Role.findOneAndUpdate(
      { _id: roleId, projectId },
      { $set, $inc: { version: 1 } },
      { new: true },
    );
    await audit("role.updated", { actorId, projectId, targetId: roleId, before: { name: role.name, moduleKeys: role.moduleKeys }, after: $set });
    return updated;
  } catch (e) {
    if (isDuplicateKey(e)) throw httpError(409, "ROLE_NAME_EXISTS", "A role with this name already exists in this project");
    throw e;
  }
}

export async function deleteRole(projectId: string, roleId: string, actorId: string) {
  const role = await findRole(projectId, roleId);
  if (role.isSystem) throw httpError(403, "ROLE_LOCKED", "System role cannot be deleted");

  const inUse = await User.countDocuments({ "projectRoles.roleId": role._id });
  if (inUse > 0) throw httpError(409, "ROLE_IN_USE", `${inUse} user(s) still hold this role. Reassign them or deactivate the role instead.`);

  await role.deleteOne();
  await audit("role.deleted", { actorId, projectId, targetId: roleId, before: { name: role.name, permissions: role.permissions } });
  return { deleted: true };
}

/** Feeds the Roles & Permissions screen. */
export async function getMatrix(projectId: string, roleId: string) {
  const role = await findRole(projectId, roleId);

  const [actions, modules, perms] = await Promise.all([
    Action.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
    Module.find({ projectId, isActive: true, key: { $in: role.moduleKeys } }).sort({ sortOrder: 1 }).lean(),
    Permission.find({ projectId, isActive: true, moduleKey: { $in: role.moduleKeys } }).lean(),
  ]);

  const granted = new Set(role.permissions);
  const usedActions = new Set(perms.map((p) => p.actionKey));

  return {
    roleId: role._id,
    roleName: role.name,
    roleVersion: role.version,
    locked: role.isSystem,                                    // the UI disables boxes and Save when true
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
export async function savePermissions(
  projectId: string,
  roleId: string,
  keys: string[],
  expectedVersion: number,
  actorId: string,
) {
  const role = await findRole(projectId, roleId);
  if (role.isSystem) throw httpError(403, "ROLE_LOCKED", "System role cannot be modified");
  if (role.version !== expectedVersion) throw httpError(409, "VERSION_CONFLICT", "This role was changed elsewhere. Reload and try again.");

  // Everything grantable for this role: active permissions of the modules it may use
  const grantable = await Permission.find({ projectId, isActive: true, moduleKey: { $in: role.moduleKeys } }).select("key").lean();
  const valid = new Set(grantable.map((p) => p.key));

  const wanted = new Set(keys.map((k) => k.toLowerCase()));
  const invalid = [...wanted].filter((k) => !valid.has(k));
  if (invalid.length) throw httpError(400, "INVALID_PERMISSION_KEYS", `Not grantable for this role: ${invalid.join(", ")}`);

  for (const k of [...wanted]) {                     // View is the base permission
    const [mod, act] = k.split(":");
    if (act !== "view" && valid.has(`${mod}:view`)) wanted.add(`${mod}:view`);
  }
  const final = [...wanted].sort();

  const res = await Role.updateOne(
    { _id: roleId, projectId, version: expectedVersion },
    { $set: { permissions: final }, $inc: { version: 1 } },
  );
  if (res.matchedCount === 0) throw httpError(409, "VERSION_CONFLICT", "This role was changed elsewhere. Reload and try again.");

  await audit("role.permissions.updated", { actorId, projectId, targetId: roleId, before: role.permissions, after: final });
  return { version: expectedVersion + 1, count: final.length, permissions: final };
}