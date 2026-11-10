"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z
            .string()
            .trim()
            .email("Enter a valid email address")
            .max(254)
            .transform((email) => email.toLowerCase()),
        password: zod_1.z
            .string()
            .min(1, "Password is required")
            .max(128, "Password is too long"),
    }).strict(),
    params: zod_1.z.object({}),
    query: zod_1.z.object({}),
});
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        currentPassword: zod_1.z
            .string()
            .min(1, "Current password is required"),
        newPassword: zod_1.z
            .string()
            .min(8, "New password must be at least 8 characters long")
            .max(128, "New password must not exceed 72 characters"),
    }),
});
//# sourceMappingURL=authValidator.js.map