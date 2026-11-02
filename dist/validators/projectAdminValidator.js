"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectAdminSchema = void 0;
const zod_1 = require("zod");
exports.createProjectAdminSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2).max(100),
        email: zod_1.z.string().trim().email(),
        password: zod_1.z.string().min(8),
    }),
    params: zod_1.z.object({
        projectId: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid project ID"),
    }),
});
//# sourceMappingURL=projectAdminValidator.js.map