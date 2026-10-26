"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserServiceError = void 0;
exports.listUsers = listUsers;
exports.getUserById = getUserById;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.updateUserStatus = updateUserStatus;
exports.resetUserPassword = resetUserPassword;
exports.deleteUser = deleteUser;
const User_js_1 = require("../models/User.js");
const password_js_1 = require("../utils/password.js");
class UserServiceError extends Error {
    statusCode;
    code;
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = "UserServiceError";
    }
}
exports.UserServiceError = UserServiceError;
function formatUser(doc) {
    return {
        id: doc._id.toString(),
        name: doc.name,
        email: doc.email,
        role: doc.role,
        projectIds: doc.projectIds ?? [],
        isActive: doc.isActive ?? true,
        lastLoginAt: doc.lastLoginAt ?? null,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}
async function listUsers(query, _currentAuth) {
    const filter = {};
    if (query.role) {
        filter.role = query.role;
    }
    if (query.isActive !== undefined) {
        filter.isActive = query.isActive;
    }
    if (query.projectId) {
        filter.projectIds = query.projectId;
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
        User_js_1.User.countDocuments(filter),
        User_js_1.User.find(filter)
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
async function getUserById(id) {
    const user = await User_js_1.User.findById(id).lean();
    if (!user) {
        throw new UserServiceError("User not found", 404, "USER_NOT_FOUND");
    }
    return formatUser(user);
}
async function createUser(input, currentAuth) {
    if (input.role === "superadmin" && currentAuth.role !== "superadmin") {
        throw new UserServiceError("Only Super Admins can create another Super Admin", 403, "FORBIDDEN");
    }
    const existing = await User_js_1.User.findOne({ email: input.email });
    if (existing) {
        throw new UserServiceError("A user with this email already exists", 409, "USER_ALREADY_EXISTS");
    }
    const passwordHash = await (0, password_js_1.hashPassword)(input.password);
    const newUser = await User_js_1.User.create({
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        projectIds: input.projectIds,
        isActive: input.isActive,
    });
    return formatUser(newUser);
}
async function updateUser(id, input, currentAuth) {
    const user = await User_js_1.User.findById(id);
    if (!user) {
        throw new UserServiceError("User not found", 404, "USER_NOT_FOUND");
    }
    if (user.role === "superadmin" && currentAuth.role !== "superadmin") {
        throw new UserServiceError("Only Super Admins can modify a Super Admin account", 403, "FORBIDDEN");
    }
    if (input.role === "superadmin" && currentAuth.role !== "superadmin") {
        throw new UserServiceError("Only Super Admins can assign the Super Admin role", 403, "FORBIDDEN");
    }
    if (input.role && input.role !== "superadmin" && user.role === "superadmin") {
        const superAdminCount = await User_js_1.User.countDocuments({ role: "superadmin" });
        if (superAdminCount <= 1) {
            throw new UserServiceError("Cannot demote the only Super Admin account", 400, "CANNOT_DEMOTE_LAST_SUPERADMIN");
        }
    }
    if (input.email && input.email !== user.email) {
        const existing = await User_js_1.User.findOne({
            email: input.email,
            _id: { $ne: id },
        });
        if (existing) {
            throw new UserServiceError("A user with this email already exists", 409, "USER_ALREADY_EXISTS");
        }
        user.email = input.email;
    }
    if (input.name !== undefined) {
        user.name = input.name;
    }
    if (input.role !== undefined) {
        user.role = input.role;
    }
    if (input.projectIds !== undefined) {
        user.projectIds = input.projectIds;
    }
    if (input.isActive !== undefined) {
        user.isActive = input.isActive;
    }
    await user.save();
    return formatUser(user);
}
async function updateUserStatus(id, isActive, currentAuth) {
    const user = await User_js_1.User.findById(id);
    if (!user) {
        throw new UserServiceError("User not found", 404, "USER_NOT_FOUND");
    }
    if (user._id.toString() === currentAuth.userId && !isActive) {
        throw new UserServiceError("You cannot deactivate your own account", 400, "CANNOT_DEACTIVATE_SELF");
    }
    if (user.role === "superadmin") {
        if (currentAuth.role !== "superadmin") {
            throw new UserServiceError("Only Super Admins can change a Super Admin status", 403, "FORBIDDEN");
        }
        if (!isActive) {
            const activeSuperAdminCount = await User_js_1.User.countDocuments({
                role: "superadmin",
                isActive: true,
            });
            if (activeSuperAdminCount <= 1) {
                throw new UserServiceError("Cannot deactivate the only active Super Admin account", 400, "CANNOT_DEACTIVATE_LAST_SUPERADMIN");
            }
        }
    }
    user.isActive = isActive;
    await user.save();
    return formatUser(user);
}
async function resetUserPassword(id, newPassword, currentAuth) {
    const user = await User_js_1.User.findById(id);
    if (!user) {
        throw new UserServiceError("User not found", 404, "USER_NOT_FOUND");
    }
    if (user.role === "superadmin" && currentAuth.role !== "superadmin") {
        throw new UserServiceError("Only Super Admins can reset a Super Admin password", 403, "FORBIDDEN");
    }
    user.passwordHash = await (0, password_js_1.hashPassword)(newPassword);
    await user.save();
    return formatUser(user);
}
async function deleteUser(id, currentAuth) {
    const user = await User_js_1.User.findById(id);
    if (!user) {
        throw new UserServiceError("User not found", 404, "USER_NOT_FOUND");
    }
    if (user._id.toString() === currentAuth.userId) {
        throw new UserServiceError("You cannot delete your own account", 400, "CANNOT_DELETE_SELF");
    }
    if (user.role === "superadmin") {
        if (currentAuth.role !== "superadmin") {
            throw new UserServiceError("Only Super Admins can delete a Super Admin account", 403, "FORBIDDEN");
        }
        const superAdminCount = await User_js_1.User.countDocuments({ role: "superadmin" });
        if (superAdminCount <= 1) {
            throw new UserServiceError("Cannot delete the only Super Admin account", 400, "CANNOT_DELETE_LAST_SUPERADMIN");
        }
    }
    await User_js_1.User.findByIdAndDelete(id);
    return {
        id: user._id.toString(),
        deleted: true,
    };
}
//# sourceMappingURL=userService.js.map