import { User } from "../models/User.js";
import { Project } from "../models/Project.js";
import { Role } from "../models/roles.js";
import { hashPassword } from "../utils/password.js";
import { httpError, isDuplicateKey } from "../utils/httpError.js";
import { audit } from "./audit.service.js";

export async function createProjectUser(
  input: { name: string; email: string; password: string; projectId: string; roleId: string },
  actorId: string,
) {
  const project = await Project.findById(input.projectId);
  if (!project) throw httpError(404, "PROJECT_NOT_FOUND", "Project not found");

  // The role must belong to THIS project (blocks attaching "LTS Admin" under another project)
  const role = await Role.findOne({ _id: input.roleId, projectId: input.projectId, isActive: true });
  if (!role) throw httpError(400, "ROLE_PROJECT_MISMATCH", "Role does not belong to this project");
  if (role.isSystem) throw httpError(400, "ROLE_LOCKED", "System role cannot be assigned");

  const email = input.email.trim().toLowerCase();
  const entry = { projectId: project._id, roleId: role._id, isActive: true, assignedBy: actorId };
  const existing = await User.findOne({ email });

  // Same person, another project: just add the project role (password in the request is ignored)
  if (existing) {
    if (existing.role === "superadmin") throw httpError(400, "NOT_ALLOWED", "Cannot attach a project role to a super admin");
    const res = await User.updateOne(
      { _id: existing._id, "projectRoles.projectId": { $ne: project._id } },
      { $push: { projectRoles: entry } },
    );
    if (res.modifiedCount === 0) throw httpError(409, "USER_ALREADY_IN_PROJECT", "User already has a role in this project");
    await audit("user.project_role.added", { actorId, projectId: project._id, targetId: existing._id, after: { roleId: role._id } });
    return { id: String(existing._id), name: existing.name, email, projectId: project._id, roleId: role._id, roleName: role.name, created: false };
  }

  try {
    const user = await User.create({
      name: input.name.trim(),
      email,
      passwordHash: await hashPassword(input.password),
      role: "user",
      projectRoles: [entry],
      isActive: true,
    });
    await audit("user.created", { actorId, projectId: project._id, targetId: user._id, after: { email, roleId: role._id } });
    return { id: String(user._id), name: user.name, email, projectId: project._id, roleId: role._id, roleName: role.name, created: true };
  } catch (e) {
    if (isDuplicateKey(e)) throw httpError(409, "EMAIL_EXISTS", "A user with this email already exists");
    throw e;
  }
}

/** Change the role of a user who is already in the project. */
export async function assignRoleToUser(projectId: string, userId: string, roleId: string, actorId: string) {
  const role = await Role.findOne({ _id: roleId, projectId, isActive: true });
  if (!role) throw httpError(400, "ROLE_PROJECT_MISMATCH", "Role does not belong to this project");
  if (role.isSystem) throw httpError(400, "ROLE_LOCKED", "System role cannot be assigned");

  const res = await User.updateOne(
    { _id: userId, role: "user", "projectRoles.projectId": projectId },
    { $set: { "projectRoles.$.roleId": role._id, "projectRoles.$.assignedBy": actorId, "projectRoles.$.isActive": true } },
  );
  if (res.matchedCount === 0) throw httpError(404, "USER_NOT_IN_PROJECT", "User not found in this project");

  await audit("user.role.changed", { actorId, projectId, targetId: userId, after: { roleId: role._id } });
  return { userId, projectId, roleId: role._id, roleName: role.name, permissions: role.permissions };
}

/** SuperAdmin suspends or restores one user's access to one project. Effective on the next request. */
export async function setProjectAccess(projectId: string, userId: string, isActive: boolean, actorId: string) {
  const res = await User.updateOne(
    { _id: userId, "projectRoles.projectId": projectId },
    { $set: { "projectRoles.$.isActive": isActive } },
  );
  if (res.matchedCount === 0) throw httpError(404, "USER_NOT_IN_PROJECT", "User not found in this project");
  await audit(isActive ? "user.project_access.restored" : "user.project_access.revoked", { actorId, projectId, targetId: userId });
  return { userId, projectId, isActive };
}

/** Block or unblock the whole account. Blocking also logs the user out everywhere. */
export async function setUserActive(userId: string, isActive: boolean, actorId: string) {
  const user = await User.findById(userId);
  if (!user) throw httpError(404, "USER_NOT_FOUND", "User not found");
  if (user.role === "superadmin") throw httpError(403, "NOT_ALLOWED", "Super admin cannot be blocked");
  user.isActive = isActive;
  if (!isActive) user.tokenVersion += 1;
  await user.save();
  await audit(isActive ? "user.unblocked" : "user.blocked", { actorId, targetId: userId });
  return { userId, isActive };
}

export async function getMyRoles(userId: string) {
  const user = await User.findById(userId).select("projectRoles");
  if (!user) throw httpError(404, "USER_NOT_FOUND", "User not found");

  const active = user.projectRoles.filter((pr) => pr.isActive);
  const roles = await Role.find({ _id: { $in: active.map((pr) => pr.roleId) }, isActive: true }).select("name permissions").lean();

  return active.map((pr) => {
    const r = roles.find((x) => String(x._id) === String(pr.roleId));
    return { projectId: pr.projectId, roleId: pr.roleId, roleName: r?.name ?? null, permissions: r?.permissions ?? [] };
  });
}