
import { Permission } from "../models/permission";
import { Role } from "../models/roles";
import { Types } from "mongoose";
import { User } from "../models/User";
/*
export class RoleServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode: string,
  ) {
    super(message);
    this.name = "RoleServiceError";
  }
}

interface CreateRoleInput {
  name: string;
  description?: string;
  permissions?: string[];
}

interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissions?: string[];
}

async function validatePermissions(keys: string[]): Promise<void> {
  const uniqueKeys = [...new Set(keys)];

  const existing = await Permission.find({
    key: { $in: uniqueKeys },
  })
    .select("key")
    .lean();

  if (existing.length !== uniqueKeys.length) {
    throw new RoleServiceError(
      "One or more permission keys do not exist",
      400,
      "INVALID_PERMISSIONS",
    );
  }
}

export async function createRole(input: CreateRoleInput) {
  const name = input.name.trim();
  const permissions = input.permissions ?? [];

  if (permissions.length > 0) {
    await validatePermissions(permissions);
  }

  return Role.create({
    name,
    description: input.description?.trim() ?? "",
    permissions: [...new Set(permissions)],
  });
}

export async function getRoles() {
  return Role.find().sort({ name: 1 }).lean();
}

export async function updateRole(
  roleId: string,
  input: UpdateRoleInput,
) {
  const role = await Role.findById(roleId);

  if (!role) {
    throw new RoleServiceError(
      "Role not found",
      404,
      "ROLE_NOT_FOUND",
    );
  }

  if (input.name !== undefined) {
    role.name = input.name.trim();
  }

  if (input.description !== undefined) {
    role.description = input.description.trim();
  }

  if (input.permissions !== undefined) {
    await validatePermissions(input.permissions);
    role.permissions = [...new Set(input.permissions)];
  }

  await role.save();

  return role;
}
*/

interface CreateRoleInput {
  name: string;
  description?: string;
  permissions?: string[];
  projectId: string;
  createdBy?: string;
}

export async function validatePermissions(keys: string[]) {
  if (keys.length === 0) return;

  const existing = await Permission.find({
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

export async function createRole(input: CreateRoleInput) {
  const name = input.name.trim();
  const permissions = [...new Set((input.permissions ?? []).map((p) => p.toLowerCase()))];

  if (permissions.length > 0) {
    await validatePermissions(permissions);
  }

  if (!Types.ObjectId.isValid(input.projectId)) {
    throw Object.assign(new Error("Invalid projectId"), {
      statusCode: 400,
      code: "INVALID_PROJECT_ID",
    });
  }

  const role = await Role.create({
    name,
    description: input.description?.trim() ?? "",
    projectId: input.projectId,
    permissions,
    createdBy: input.createdBy,
  });

  return role;
}

export async function getRolesByProject(projectId: string) {
  return Role.find({ projectId, isActive: true }).sort({ name: 1 });
}

export async function getRoleById(roleId: string, projectId: string) {
  return Role.findOne({ _id: roleId, projectId, isActive: true });
}
export async function updateRole(
  roleId: string,
  projectId: string,
  data: { name?: string; description?: string; permissions?: string[] },
) {
  const role = await Role.findOne({ _id: roleId, projectId });
  if (!role) {
    throw Object.assign(new Error("Role not found"), { statusCode: 404, code: "ROLE_NOT_FOUND" });
  }

  if (data.name !== undefined) role.name = data.name.trim();
  if (data.description !== undefined) role.description = data.description.trim();
  if (data.permissions !== undefined) {
    const permissions = [...new Set(data.permissions.map((p) => p.toLowerCase()))];
    await validatePermissions(permissions);
    role.permissions = permissions;
  }

  await role.save();
  return role;
}
export async function assignRoleToUser(
    userId: string,
    projectId: string,
    roleId: string,
  ) {
    if (!Types.ObjectId.isValid(roleId)) {
      throw Object.assign(new Error("Invalid roleId"), {
        statusCode: 400,
        code: "INVALID_ROLE_ID",
      });
    }
  
    const role = await Role.findOne({ _id: roleId, projectId, isActive: true });
    if (!role) {
      throw Object.assign(new Error("Role does not belong to this project"), {
        statusCode: 400,
        code: "ROLE_PROJECT_MISMATCH",
      });
    }
  
    const user = await User.findById(userId);
    if (!user) {
      throw Object.assign(new Error("User not found"), {
        statusCode: 404,
        code: "USER_NOT_FOUND",
      });
    }
  
    if (!user.projectIds.includes(projectId)) {
      throw Object.assign(new Error("User does not belong to this project"), {
        statusCode: 400,
        code: "USER_NOT_IN_PROJECT",
      });
    }
  
    // Remove previous role for this project (if any)
    const existingIndex = user.projectRoles.findIndex(
      (pr) => pr.projectId === projectId,
    );
  
    if (existingIndex >= 0) {
      user.projectRoles.splice(existingIndex, 1);
    }
  
    // Add the new role
    user.projectRoles.push({
      projectId,
      roleId: role._id,
    });
  
    await user.save();
  
    return {
      userId: user._id,
      projectId,
      roleId: role._id,
      roleName: role.name,
      permissions: role.permissions,
    };
  }
  export async function getMyRoles(userId: string) {

    const user = await User.findById(userId).select("projectRoles");
  
    if (!user) {
      throw Object.assign(new Error("User not found"), {
        statusCode: 404,
        code: "USER_NOT_FOUND",
      });
    }
  
    if (!user.projectRoles || user.projectRoles.length === 0) {
      return [];
    }
  
    const roleIds = user.projectRoles.map((pr) => pr.roleId);
  
    const roles = await Role.find({
      _id: { $in: roleIds },
      isActive: true,
    }).select("name permissions projectId");
  
    const result = user.projectRoles.map((pr) => {
      const role = roles.find(
        (r) => r._id.toString() === pr.roleId.toString(),
      );
  
      return {
        projectId: pr.projectId,
        roleId: pr.roleId,
        roleName: role?.name ?? null,
        permissions: role?.permissions ?? [],
      };
    });
  
    return result;
  }
  