"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserSchema = exports.resetPasswordSchema = exports.updateUserStatusSchema = exports.updateUserSchema = exports.getUserSchema = exports.createUserSchema = exports.listUsersSchema = void 0;
const zod_1 = require("zod");
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
exports.listUsersSchema = zod_1.z.object({
    body: zod_1.z.object({}),
    params: zod_1.z.object({}),
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(10),
        search: zod_1.z.string().trim().max(100).optional(),
        role: zod_1.z.enum(["superadmin", "admin", "manager", "user"]).optional(),
        isActive: zod_1.z
            .enum(["true", "false"])
            .transform((val) => val === "true")
            .optional(),
        projectId: zod_1.z.string().trim().optional(),
        sortBy: zod_1.z
            .enum(["createdAt", "name", "email", "lastLoginAt"])
            .default("createdAt"),
        sortOrder: zod_1.z.enum(["asc", "desc"]).default("desc"),
    }),
});
exports.createUserSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        name: zod_1.z
            .string()
            .trim()
            .min(2, "Name must be at least 2 characters")
            .max(100, "Name cannot exceed 100 characters"),
        email: zod_1.z
            .string()
            .trim()
            .email("Enter a valid email address")
            .max(254)
            .transform((email) => email.toLowerCase()),
        password: zod_1.z
            .string()
            .min(8, "Password must be at least 8 characters")
            .max(128, "Password cannot exceed 128 characters"),
        role: zod_1.z.enum(["superadmin", "admin", "manager", "user"]).default("user"),
        projectIds: zod_1.z.array(zod_1.z.string().trim()).default([]),
        isActive: zod_1.z.boolean().default(true),
    })
        .strict(),
    params: zod_1.z.object({}),
    query: zod_1.z.object({}),
});
exports.getUserSchema = zod_1.z.object({
    body: zod_1.z.object({}),
    params: zod_1.z
        .object({
        id: zod_1.z.string().regex(objectIdRegex, "Invalid user ID format"),
    })
        .strict(),
    query: zod_1.z.object({}),
});
exports.updateUserSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        name: zod_1.z
            .string()
            .trim()
            .min(2, "Name must be at least 2 characters")
            .max(100, "Name cannot exceed 100 characters")
            .optional(),
        email: zod_1.z
            .string()
            .trim()
            .email("Enter a valid email address")
            .max(254)
            .transform((email) => email.toLowerCase())
            .optional(),
        role: zod_1.z.enum(["superadmin", "admin", "manager", "user"]).optional(),
        projectIds: zod_1.z.array(zod_1.z.string().trim()).optional(),
        isActive: zod_1.z.boolean().optional(),
    })
        .strict(),
    params: zod_1.z
        .object({
        id: zod_1.z.string().regex(objectIdRegex, "Invalid user ID format"),
    })
        .strict(),
    query: zod_1.z.object({}),
});
exports.updateUserStatusSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        isActive: zod_1.z.boolean({
            message: "isActive boolean is required",
        }),
    })
        .strict(),
    params: zod_1.z
        .object({
        id: zod_1.z.string().regex(objectIdRegex, "Invalid user ID format"),
    })
        .strict(),
    query: zod_1.z.object({}),
});
exports.resetPasswordSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        password: zod_1.z
            .string()
            .min(8, "Password must be at least 8 characters")
            .max(128, "Password cannot exceed 128 characters"),
    })
        .strict(),
    params: zod_1.z
        .object({
        id: zod_1.z.string().regex(objectIdRegex, "Invalid user ID format"),
    })
        .strict(),
    query: zod_1.z.object({}),
});
exports.deleteUserSchema = zod_1.z.object({
    body: zod_1.z.object({}),
    params: zod_1.z
        .object({
        id: zod_1.z.string().regex(objectIdRegex, "Invalid user ID format"),
    })
        .strict(),
    query: zod_1.z.object({}),
});
//# sourceMappingURL=userValidator.js.map