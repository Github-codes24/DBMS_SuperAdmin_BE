import { Types } from "mongoose";
import { randomBytes } from "node:crypto";
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

/** List all users assigned to a project along with their project role. */
export async function getProjectUsers(projectId: string) {
  const project = await Project.findById(projectId);
  if (!project) throw httpError(404, "PROJECT_NOT_FOUND", "Project not found");

  const users = await User.find({
    "projectRoles.projectId": project._id,
  })
    .select("name email role projectRoles isActive lastLoginAt createdAt")
    .lean();

  const roleIds = users.flatMap((u) =>
    (u.projectRoles || [])
      .filter((pr: any) => String(pr.projectId) === String(project._id))
      .map((pr: any) => pr.roleId),
  );

  const roles = await Role.find({ _id: { $in: roleIds } })
    .select("name permissions")
    .lean();
  const roleMap = new Map(roles.map((r) => [String(r._id), r]));

  return users.map((u) => {
    const pr = (u.projectRoles || []).find(
      (p: any) => String(p.projectId) === String(project._id),
    );
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

export interface CreateProjectAdminInput {
  name?: string;
  fullName?: string;
  email: string;
  phone?: string;
  username?: string;
  status?: string;
  isActive?: boolean;
  password?: string;
  projects?: string[];
}

/** List all Project Admins for dropdowns and admin management */
export async function listProjectAdmins() {
  const users = await User.find({
    $or: [{ role: "admin" }, { "projectRoles.0": { $exists: true } }],
    role: { $ne: "superadmin" },
  })
    .select("name email phone username role isActive projectRoles createdAt")
    .lean();

  const allProjects = await Project.find({ type: "tenant" })
    .select("_id projectId name adminId")
    .lean();

  return users.map((u) => {
    const assignedProjects = allProjects.filter(
      (p) =>
        String(p.adminId) === String(u._id) ||
        (u.projectRoles || []).some(
          (pr: any) => String(pr.projectId) === String(p._id),
        ),
    );

    return {
      _id: u._id,
      id: String(u._id),
      name: u.name,
      fullName: u.name,
      email: u.email,
      phone: (u as any).phone || "",
      username: (u as any).username || "",
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
export async function createPlatformAdmin(
  input: CreateProjectAdminInput,
  actorId: string,
) {
  const name = (input.name || input.fullName || "").trim();
  if (!name) throw httpError(400, "NAME_REQUIRED", "Full name is required");

  const email = input.email.trim().toLowerCase();
  const phone = (input.phone || "").trim();
  const username = (input.username || "").trim();
  const isActive =
    input.isActive !== undefined
      ? Boolean(input.isActive)
      : input.status
        ? input.status.toLowerCase() === "active"
        : true;

  const rawPassword =
    input.password && input.password.length >= 8
      ? input.password
      : randomBytes(16).toString("hex");

  const passwordHash = await hashPassword(rawPassword);

  const projectInput = input.projects || [];
  const resolvedProjects = await Project.find({
    $or: [
      { _id: { $in: projectInput.filter((id) => Types.ObjectId.isValid(id)) } },
      { projectId: { $in: projectInput } },
      { name: { $in: projectInput } },
    ],
  });

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role === "superadmin") {
      throw httpError(400, "NOT_ALLOWED", "Cannot make a superadmin a project admin");
    }
    existing.name = name;
    (existing as any).phone = phone;
    (existing as any).username = username;
    existing.role = "admin";
    existing.isActive = isActive;

    for (const p of resolvedProjects) {
      if (!existing.projectRoles.some((pr) => String(pr.projectId) === String(p._id))) {
        existing.projectRoles.push({
          projectId: p._id as any,
          roleId: undefined as any,
          isActive: true,
          assignedBy: actorId as any,
        });
      }
      if (!p.adminId) {
        await Project.updateOne({ _id: p._id }, { $set: { adminId: existing._id } });
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
    const user = await User.create({
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
      await Project.updateOne({ _id: p._id }, { $set: { adminId: user._id } });
    }

    await audit("admin.created", { actorId, targetId: user._id, after: { email, name } });

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
  } catch (e) {
    if (isDuplicateKey(e)) throw httpError(409, "EMAIL_EXISTS", "A user with this email already exists");
    throw e;
  }
}

/** Update an existing Project Admin */
export async function updatePlatformAdmin(
  adminId: string,
  input: Partial<CreateProjectAdminInput>,
  actorId: string,
) {
  const user = await User.findById(adminId);
  if (!user) throw httpError(404, "USER_NOT_FOUND", "Project Admin not found");
  if (user.role === "superadmin") throw httpError(403, "NOT_ALLOWED", "Cannot edit superadmin");

  if (input.name || input.fullName) user.name = (input.name || input.fullName)!.trim();
  if (input.email) user.email = input.email.trim().toLowerCase();
  if (input.phone !== undefined) (user as any).phone = input.phone.trim();
  if (input.username !== undefined) (user as any).username = input.username.trim();
  if (input.status !== undefined) user.isActive = input.status.toLowerCase() === "active";
  if (input.isActive !== undefined) user.isActive = Boolean(input.isActive);

  if (input.projects !== undefined) {
    const resolvedProjects = await Project.find({
      $or: [
        { _id: { $in: input.projects.filter((id) => Types.ObjectId.isValid(id)) } },
        { projectId: { $in: input.projects } },
        { name: { $in: input.projects } },
      ],
    });

    user.projectRoles = resolvedProjects.map((p) => ({
      projectId: p._id as any,
      isActive: true,
      assignedBy: actorId as any,
    })) as any;

    await Project.updateMany({ adminId: user._id }, { $set: { adminId: null } });
    if (resolvedProjects.length > 0) {
      await Project.updateMany(
        { _id: { $in: resolvedProjects.map((p) => p._id) } },
        { $set: { adminId: user._id } },
      );
    }
  }

  await user.save();
  await audit("admin.updated", { actorId, targetId: user._id, after: input });
  return {
    _id: user._id,
    id: String(user._id),
    name: user.name,
    fullName: user.name,
    email: user.email,
    phone: (user as any).phone || "",
    username: (user as any).username || "",
    status: user.isActive ? "active" : "inactive",
    isActive: user.isActive,
  };
}

/** Delete a Project Admin */
export async function deletePlatformAdmin(adminId: string, actorId: string) {
  const user = await User.findById(adminId);
  if (!user) throw httpError(404, "USER_NOT_FOUND", "Project Admin not found");
  if (user.role === "superadmin") throw httpError(403, "NOT_ALLOWED", "Super admin cannot be deleted");

  await Project.updateMany({ adminId: user._id }, { $set: { adminId: null } });
  await User.deleteOne({ _id: user._id });
  await audit("admin.deleted", { actorId, targetId: user._id, after: { name: user.name } });
  return { id: adminId, name: user.name };
}