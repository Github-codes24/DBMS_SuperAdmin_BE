"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportQuerySchema = void 0;
const zod_1 = require("zod");
exports.reportQuerySchema = zod_1.z.object({
    type: zod_1.z.enum(["users"]).default("users"),
    // empty string from the UI dropdown ("All projects") becomes undefined
    projectId: zod_1.z
        .string()
        .trim()
        .regex(/^[0-9a-fA-F]{24}$/, "Invalid projectId")
        .or(zod_1.z.literal(""))
        .optional()
        .transform((v) => v || undefined),
    range: zod_1.z.enum(["7d", "30d", "90d", "1y", "custom", "all"]).default("30d"),
    status: zod_1.z.enum(["all", "active", "inactive", "blocked"]).default("all"),
    from: zod_1.z.string().optional(),
    to: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(500).default(10),
});
//# sourceMappingURL=reportValidator.js.map