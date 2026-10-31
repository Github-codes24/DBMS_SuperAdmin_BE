// import { User } from "../models/User.js";
// import { hashPassword } from "../utils/password.js";
// import type {
//   CreateUserInput,
//   ListUsersQuery,
//   UpdateUserInput,
// } from "../validators/userValidator.js";

// export class UserServiceError extends Error {
//   constructor(
//     message: string,
//     public readonly statusCode: number,
//     public readonly code: string,
//   ) {
//     super(message);
//     this.name = "UserServiceError";
//   }
// }

// export interface CurrentAuth {
//   userId?: string;
//   role?: string;
//   projectIds?: string[];
// }

// export interface UserResponse {
//   id: string;
//   name: string;
//   email: string;
//   role: string;
//   projectIds: string[];
//   isActive: boolean;
//   lastLoginAt: Date | null;
//   createdAt: Date;
//   updatedAt: Date;
// }

// export interface ListUsersResult {
//   users: UserResponse[];
//   pagination: {
//     total: number;
//     page: number;
//     limit: number;
//     totalPages: number;
//     hasNextPage: boolean;
//     hasPrevPage: boolean;
//   };
// }

// function formatUser(doc: any): UserResponse {
//   return {
//     id: doc._id.toString(),
//     name: doc.name,
//     email: doc.email,
//     role: doc.role,
//     projectIds: doc.projectIds ?? [],
//     isActive: doc.isActive ?? true,
//     lastLoginAt: doc.lastLoginAt ?? null,
//     createdAt: doc.createdAt,
//     updatedAt: doc.updatedAt,
//   };
// }

// export async function listUsers(
//   query: ListUsersQuery,
//   _currentAuth: CurrentAuth,
// ): Promise<ListUsersResult> {
//   const filter: Record<string, unknown> = {};

//   if (query.role) {
//     filter.role = query.role;
//   }

//   if (query.isActive !== undefined) {
//     filter.isActive = query.isActive;
//   }

//   if (query.projectId) {
//     filter.projectIds = query.projectId;
//   }

//   if (query.search) {
//     const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
//     filter.$or = [
//       { name: { $regex: escaped, $options: "i" } },
//       { email: { $regex: escaped, $options: "i" } },
//     ];
//   }

//   const page = query.page || 1;
//   const limit = query.limit || 10;
//   const skip = (page - 1) * limit;
//   const sortBy = query.sortBy || "createdAt";
//   const sortOrder = query.sortOrder === "asc" ? 1 : -1;

//   const [total, docs] = await Promise.all([
//     User.countDocuments(filter),
//     User.find(filter)
//       .sort({ [sortBy]: sortOrder })
//       .skip(skip)
//       .limit(limit)
//       .lean(),
//   ]);

//   return {
//     users: docs.map(formatUser),
//     pagination: {
//       total,
//       page,
//       limit,
//       totalPages: Math.ceil(total / limit) || 1,
//       hasNextPage: page * limit < total,
//       hasPrevPage: page > 1,
//     },
//   };
// }

// export async function getUserById(id: string): Promise<UserResponse> {
//   const user = await User.findById(id).lean();

//   if (!user) {
//     throw new UserServiceError("User not found", 404, "USER_NOT_FOUND");
//   }

//   return formatUser(user);
// }

// export async function createUser(
//   input: CreateUserInput,
//   currentAuth: CurrentAuth,
// ): Promise<UserResponse> {
//   if (input.role === "superadmin" && currentAuth.role !== "superadmin") {
//     throw new UserServiceError(
//       "Only Super Admins can create another Super Admin",
//       403,
//       "FORBIDDEN",
//     );
//   }

//   const existing = await User.findOne({ email: input.email });
//   if (existing) {
//     throw new UserServiceError(
//       "A user with this email already exists",
//       409,
//       "USER_ALREADY_EXISTS",
//     );
//   }

//   const passwordHash = await hashPassword(input.password);

//   const newUser = await User.create({
//     name: input.name,
//     email: input.email,
//     passwordHash,
//     role: input.role,
//     projectIds: input.projectIds,
//     isActive: input.isActive,
//   });

//   return formatUser(newUser);
// }

// export async function updateUser(
//   id: string,
//   input: UpdateUserInput,
//   currentAuth: CurrentAuth,
// ): Promise<UserResponse> {
//   const user = await User.findById(id);

//   if (!user) {
//     throw new UserServiceError("User not found", 404, "USER_NOT_FOUND");
//   }

//   if (user.role === "superadmin" && currentAuth.role !== "superadmin") {
//     throw new UserServiceError(
//       "Only Super Admins can modify a Super Admin account",
//       403,
//       "FORBIDDEN",
//     );
//   }

//   if (input.role === "superadmin" && currentAuth.role !== "superadmin") {
//     throw new UserServiceError(
//       "Only Super Admins can assign the Super Admin role",
//       403,
//       "FORBIDDEN",
//     );
//   }

//   if (input.role && input.role !== "superadmin" && user.role === "superadmin") {
//     const superAdminCount = await User.countDocuments({ role: "superadmin" });
//     if (superAdminCount <= 1) {
//       throw new UserServiceError(
//         "Cannot demote the only Super Admin account",
//         400,
//         "CANNOT_DEMOTE_LAST_SUPERADMIN",
//       );
//     }
//   }

//   if (input.email && input.email !== user.email) {
//     const existing = await User.findOne({
//       email: input.email,
//       _id: { $ne: id },
//     });
//     if (existing) {
//       throw new UserServiceError(
//         "A user with this email already exists",
//         409,
//         "USER_ALREADY_EXISTS",
//       );
//     }
//     user.email = input.email;
//   }

//   if (input.name !== undefined) {
//     user.name = input.name;
//   }

//   if (input.role !== undefined) {
//     user.role = input.role;
//   }

//   if (input.projectIds !== undefined) {
//     user.projectIds = input.projectIds;
//   }

//   if (input.isActive !== undefined) {
//     user.isActive = input.isActive;
//   }

//   await user.save();

//   return formatUser(user);
// }

// export async function updateUserStatus(
//   id: string,
//   isActive: boolean,
//   currentAuth: CurrentAuth,
// ): Promise<UserResponse> {
//   const user = await User.findById(id);

//   if (!user) {
//     throw new UserServiceError("User not found", 404, "USER_NOT_FOUND");
//   }

//   if (user._id.toString() === currentAuth.userId && !isActive) {
//     throw new UserServiceError(
//       "You cannot deactivate your own account",
//       400,
//       "CANNOT_DEACTIVATE_SELF",
//     );
//   }

//   if (user.role === "superadmin") {
//     if (currentAuth.role !== "superadmin") {
//       throw new UserServiceError(
//         "Only Super Admins can change a Super Admin status",
//         403,
//         "FORBIDDEN",
//       );
//     }

//     if (!isActive) {
//       const activeSuperAdminCount = await User.countDocuments({
//         role: "superadmin",
//         isActive: true,
//       });

//       if (activeSuperAdminCount <= 1) {
//         throw new UserServiceError(
//           "Cannot deactivate the only active Super Admin account",
//           400,
//           "CANNOT_DEACTIVATE_LAST_SUPERADMIN",
//         );
//       }
//     }
//   }

//   user.isActive = isActive;
//   await user.save();

//   return formatUser(user);
// }

// export async function resetUserPassword(
//   id: string,
//   newPassword: string,
//   currentAuth: CurrentAuth,
// ): Promise<UserResponse> {
//   const user = await User.findById(id);

//   if (!user) {
//     throw new UserServiceError("User not found", 404, "USER_NOT_FOUND");
//   }

//   if (user.role === "superadmin" && currentAuth.role !== "superadmin") {
//     throw new UserServiceError(
//       "Only Super Admins can reset a Super Admin password",
//       403,
//       "FORBIDDEN",
//     );
//   }

//   user.passwordHash = await hashPassword(newPassword);
//   await user.save();

//   return formatUser(user);
// }

// export async function deleteUser(
//   id: string,
//   currentAuth: CurrentAuth,
// ): Promise<{ id: string; deleted: boolean }> {
//   const user = await User.findById(id);

//   if (!user) {
//     throw new UserServiceError("User not found", 404, "USER_NOT_FOUND");
//   }

//   if (user._id.toString() === currentAuth.userId) {
//     throw new UserServiceError(
//       "You cannot delete your own account",
//       400,
//       "CANNOT_DELETE_SELF",
//     );
//   }

//   if (user.role === "superadmin") {
//     if (currentAuth.role !== "superadmin") {
//       throw new UserServiceError(
//         "Only Super Admins can delete a Super Admin account",
//         403,
//         "FORBIDDEN",
//       );
//     }

//     const superAdminCount = await User.countDocuments({ role: "superadmin" });
//     if (superAdminCount <= 1) {
//       throw new UserServiceError(
//         "Cannot delete the only Super Admin account",
//         400,
//         "CANNOT_DELETE_LAST_SUPERADMIN",
//       );
//     }
//   }

//   await User.findByIdAndDelete(id);

//   return {
//     id: user._id.toString(),
//     deleted: true,
//   };
// }

import { Types } from "mongoose";
import { User, RefreshSession } from "../models/User.js";
import { Role } from "../models/roles.js";
import { hashPassword } from "../utils/password.js";
import type {
  CreateUserInput,
  ListUsersQuery,
  UpdateUserInput,
} from "../validators/userValidator.js";

export class UserServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "UserServiceError";
  }
}
export interface CurrentAuth {
  userId?: string;
  role?: string;
  projectIds?: string[];
}

export interface UserProjectRoleResponse {
  projectId: string;
  roleId: string;
  isActive: boolean;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  projectRoles: UserProjectRoleResponse[]; // NEW: the source of truth
  projectIds: string[];                    // kept for the frontend: derived from active projectRoles
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListUsersResult {
  users: UserResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

function formatUser(doc: any): UserResponse {
  const projectRoles: UserProjectRoleResponse[] = (doc.projectRoles ?? []).map(
    (pr: any) => ({
      projectId: String(pr.projectId),
      roleId: String(pr.roleId),
      isActive: pr.isActive ?? true,
    }),
  );

  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    role: doc.role,
    projectRoles,
    projectIds: projectRoles.filter((p) => p.isActive).map((p) => p.projectId),
    isActive: doc.isActive ?? true,
    lastLoginAt: doc.lastLoginAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/* ------------------------------ helpers ------------------------------ */

/** Verifies every role really belongs to its project, then builds the embedded entries. */
async function buildProjectRoles(
  entries: { projectId: string; roleId: string }[],
  currentAuth: CurrentAuth,
) {
  if (new Set(entries.map((e) => e.projectId)).size !== entries.length) {
    throw new UserServiceError(
      "A user can hold only one role per project",
      400,
      "DUPLICATE_PROJECT",
    );
  }

  const roles = await Role.find({
    _id: { $in: entries.map((e) => e.roleId) },
    isActive: true,
    isSystem: false,
  })
    .select("projectId")
    .lean();

  const projectOfRole = new Map(roles.map((r) => [String(r._id), String(r.projectId)]));

  for (const e of entries) {
    if (projectOfRole.get(e.roleId) !== e.projectId) {
      throw new UserServiceError(
        "Role does not belong to the selected project",
        400,
        "ROLE_PROJECT_MISMATCH",
      );
    }
  }

  return entries.map((e) => ({
    projectId: new Types.ObjectId(e.projectId),
    roleId: new Types.ObjectId(e.roleId),
    isActive: true,
    ...(currentAuth.userId ? { assignedBy: new Types.ObjectId(currentAuth.userId) } : {}),
  }));
}

/** Same rules for updateUser and updateUserStatus. */
async function assertCanDeactivate(user: any, currentAuth: CurrentAuth) {
  if (user._id.toString() === currentAuth.userId) {
    throw new UserServiceError(
      "You cannot deactivate your own account",
      400,
      "CANNOT_DEACTIVATE_SELF",
    );
  }

  if (user.role === "superadmin") {
    if (currentAuth.role !== "superadmin") {
      throw new UserServiceError(
        "Only Super Admins can change a Super Admin status",
        403,
        "FORBIDDEN",
      );
    }

    const activeSuperAdminCount = await User.countDocuments({
      role: "superadmin",
      isActive: true,
    });

    if (activeSuperAdminCount <= 1) {
      throw new UserServiceError(
        "Cannot deactivate the only active Super Admin account",
        400,
        "CANNOT_DEACTIVATE_LAST_SUPERADMIN",
      );
    }
  }
}

/** Kills access immediately: old access tokens fail the tokenVersion check, refresh tokens are revoked. */
async function revokeSessions(userId: string) {
  await RefreshSession.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

/* ------------------------------ queries ------------------------------ */

export async function listUsers(
  query: ListUsersQuery,
  _currentAuth: CurrentAuth,
): Promise<ListUsersResult> {
  const filter: Record<string, unknown> = {};

  if (query.role) {
    filter.role = query.role;
  }

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive;
  }

  if (query.projectId) {
    if (!Types.ObjectId.isValid(query.projectId)) {
      throw new UserServiceError("Invalid projectId", 400, "INVALID_ID");
    }
    filter["projectRoles.projectId"] = new Types.ObjectId(query.projectId); // CHANGED from projectIds
  }

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
    ];
  }

  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder === "asc" ? 1 : -1;

  const [total, docs] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    users: docs.map(formatUser),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
}

export async function getUserById(id: string): Promise<UserResponse> {
  const user = await User.findById(id).lean();

  if (!user) {
    throw new UserServiceError("User not found", 404, "USER_NOT_FOUND");
  }

  return formatUser(user);
}

/* ------------------------------ commands ------------------------------ */

export async function createUser(
  input: CreateUserInput,
  currentAuth: CurrentAuth,
): Promise<UserResponse> {
  const role = input.role ?? "user";

  if (role === "superadmin" && currentAuth.role !== "superadmin") {
    throw new UserServiceError(
      "Only Super Admins can create another Super Admin",
      403,
      "FORBIDDEN",
    );
  }

  if (role === "superadmin" && input.projectRoles?.length) {
    throw new UserServiceError(
      "A Super Admin does not hold project roles",
      400,
      "NOT_ALLOWED",
    );
  }

  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw new UserServiceError(
      "A user with this email already exists",
      409,
      "USER_ALREADY_EXISTS",
    );
  }

  const passwordHash = await hashPassword(input.password);

  const newUser = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role,
    projectRoles: await buildProjectRoles(input.projectRoles ?? [], currentAuth), // CHANGED from projectIds
    isActive: input.isActive,
  });

  return formatUser(newUser.toObject());
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
  currentAuth: CurrentAuth,
): Promise<UserResponse> {
  const user = await User.findById(id);

  if (!user) {
    throw new UserServiceError("User not found", 404, "USER_NOT_FOUND");
  }

  if (user.role === "superadmin" && currentAuth.role !== "superadmin") {
    throw new UserServiceError(
      "Only Super Admins can modify a Super Admin account",
      403,
      "FORBIDDEN",
    );
  }

  if (input.role === "superadmin" && currentAuth.role !== "superadmin") {
    throw new UserServiceError(
      "Only Super Admins can assign the Super Admin role",
      403,
      "FORBIDDEN",
    );
  }

  if (input.role && input.role !== user.role && user._id.toString() === currentAuth.userId) {
    throw new UserServiceError(
      "You cannot change your own account type",
      400,
      "CANNOT_CHANGE_OWN_ROLE",
    );
  }

  if (input.role && input.role !== "superadmin" && user.role === "superadmin") {
    const superAdminCount = await User.countDocuments({ role: "superadmin" });
    if (superAdminCount <= 1) {
      throw new UserServiceError(
        "Cannot demote the only Super Admin account",
        400,
        "CANNOT_DEMOTE_LAST_SUPERADMIN",
      );
    }
  }

  if (input.email && input.email !== user.email) {
    const existing = await User.findOne({
      email: input.email,
      _id: { $ne: id },
    });
    if (existing) {
      throw new UserServiceError(
        "A user with this email already exists",
        409,
        "USER_ALREADY_EXISTS",
      );
    }
    user.email = input.email;
  }

  if (input.name !== undefined) {
    user.name = input.name;
  }

  let mustRevoke = false;

  if (input.role !== undefined && input.role !== user.role) {
    user.role = input.role;
    if (input.role === "superadmin") user.set("projectRoles", []); // a Super Admin needs no project roles
    user.tokenVersion += 1;
    mustRevoke = true;
  }

  // CHANGED: projectIds became projectRoles. Sending it replaces the whole list; omit it to leave it unchanged.
  if (input.projectRoles !== undefined) {
    if (user.role === "superadmin") {
      throw new UserServiceError(
        "A Super Admin does not hold project roles",
        400,
        "NOT_ALLOWED",
      );
    }
    user.set("projectRoles", await buildProjectRoles(input.projectRoles, currentAuth));
  }

  if (input.isActive !== undefined && input.isActive !== user.isActive) {
    if (!input.isActive) {
      await assertCanDeactivate(user, currentAuth);
      user.tokenVersion += 1;
      mustRevoke = true;
    }
    user.isActive = input.isActive;
  }

  await user.save();
  if (mustRevoke) await revokeSessions(user._id.toString());

  return formatUser(user.toObject());
}

export async function updateUserStatus(
  id: string,
  isActive: boolean,
  currentAuth: CurrentAuth,
): Promise<UserResponse> {
  const user = await User.findById(id);

  if (!user) {
    throw new UserServiceError("User not found", 404, "USER_NOT_FOUND");
  }

  if (user.role === "superadmin" && currentAuth.role !== "superadmin") {
    throw new UserServiceError(
      "Only Super Admins can change a Super Admin status",
      403,
      "FORBIDDEN",
    );
  }

  if (!isActive) {
    await assertCanDeactivate(user, currentAuth);
    user.tokenVersion += 1; // CHANGED: logs the user out on their next request
  }

  user.isActive = isActive;
  await user.save();

  if (!isActive) await revokeSessions(user._id.toString()); // CHANGED: no new tokens via refresh

  return formatUser(user.toObject());
}

export async function resetUserPassword(
  id: string,
  newPassword: string,
  currentAuth: CurrentAuth,
): Promise<UserResponse> {
  const user = await User.findById(id);

  if (!user) {
    throw new UserServiceError("User not found", 404, "USER_NOT_FOUND");
  }

  if (user.role === "superadmin" && currentAuth.role !== "superadmin") {
    throw new UserServiceError(
      "Only Super Admins can reset a Super Admin password",
      403,
      "FORBIDDEN",
    );
  }

  user.passwordHash = await hashPassword(newPassword);
  user.tokenVersion += 1; // CHANGED: existing sessions stop working
  await user.save();

  await revokeSessions(user._id.toString());

  return formatUser(user.toObject());
}

export async function deleteUser(
  id: string,
  currentAuth: CurrentAuth,
): Promise<{ id: string; deleted: boolean }> {
  const user = await User.findById(id);

  if (!user) {
    throw new UserServiceError("User not found", 404, "USER_NOT_FOUND");
  }

  if (user._id.toString() === currentAuth.userId) {
    throw new UserServiceError(
      "You cannot delete your own account",
      400,
      "CANNOT_DELETE_SELF",
    );
  }

  if (user.role === "superadmin") {
    if (currentAuth.role !== "superadmin") {
      throw new UserServiceError(
        "Only Super Admins can delete a Super Admin account",
        403,
        "FORBIDDEN",
      );
    }

    const superAdminCount = await User.countDocuments({ role: "superadmin" });
    if (superAdminCount <= 1) {
      throw new UserServiceError(
        "Cannot delete the only Super Admin account",
        400,
        "CANNOT_DELETE_LAST_SUPERADMIN",
      );
    }
  }

  await User.findByIdAndDelete(id);
  await RefreshSession.deleteMany({ userId: user._id }); // CHANGED: no orphan sessions

  return {
    id: user._id.toString(),
    deleted: true,
  };
}