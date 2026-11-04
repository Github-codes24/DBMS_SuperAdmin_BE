"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeDto = exports.assignRoleDto = exports.createProjectUserDto = exports.updateActionDto = exports.createActionDto = exports.moduleActionsDto = exports.updateModuleDto = exports.bulkModulesDto = exports.savePermissionsDto = exports.updateRoleDto = exports.createRoleDto = exports.updateProjectDto = exports.createProjectDto = void 0;
// validators/rbac.ts
const zod_1 = require("zod");
const key = zod_1.z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_-]{1,47}$/);
const permKey = zod_1.z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_-]{1,47}:[a-z][a-z0-9_-]{1,47}$/);
const objectId = zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/);
exports.createProjectDto = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2).max(100),
        description: zod_1.z.string().trim().max(500).optional()
    }).strict(),
    params: zod_1.z.object({}).strict(),
    query: zod_1.z.object({}).strict()
});
exports.updateProjectDto = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2).max(100).optional(),
        description: zod_1.z.string().trim().max(500).optional(),
        status: zod_1.z.enum(["active", "inactive"]).optional(),
    }).strict(),
    params: zod_1.z.object({
        projectId: objectId,
    }).strict(),
    query: zod_1.z.object({}).strict(),
});
exports.createRoleDto = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2).max(60),
        description: zod_1.z.string().trim().max(300).optional(),
        moduleKeys: zod_1.z.array(key).max(200).default([]),
    }).strict(),
    params: zod_1.z.object({
        projectId: objectId,
    }).strict(),
    query: zod_1.z.object({}).strict(),
});
exports.updateRoleDto = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2).max(60).optional(),
        description: zod_1.z.string().trim().max(300).optional(),
        moduleKeys: zod_1.z.array(key).max(200).optional(),
        isActive: zod_1.z.boolean().optional(),
    }).strict(),
    params: zod_1.z.object({
        projectId: objectId,
        roleId: objectId,
    }).strict(),
    query: zod_1.z.object({}).strict(),
});
exports.savePermissionsDto = zod_1.z.object({
    body: zod_1.z.object({
        expectedVersion: zod_1.z.number().int().min(1),
        permissions: zod_1.z.array(permKey).max(1000),
    }).strict(),
    params: zod_1.z.object({
        projectId: objectId,
        roleId: objectId,
    }).strict(),
    query: zod_1.z.object({}).strict(),
});
exports.bulkModulesDto = zod_1.z.object({
    body: zod_1.z.object({
        modules: zod_1.z.array(zod_1.z.object({
            key,
            name: zod_1.z.string().trim().min(2).max(80),
            description: zod_1.z.string().trim().max(300).optional(),
            actions: zod_1.z.array(key).optional(),
        }).strict()).min(1).max(100),
    }).strict(),
    params: zod_1.z.object({
        projectId: objectId,
    }).strict(),
    query: zod_1.z.object({}).strict(),
});
exports.updateModuleDto = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2).max(80).optional(),
        description: zod_1.z.string().trim().max(300).optional(),
        sortOrder: zod_1.z.number().int().optional(),
        isActive: zod_1.z.boolean().optional(),
    }).strict(),
    params: zod_1.z.object({
        projectId: objectId,
        moduleId: objectId,
    }).strict(),
    query: zod_1.z.object({}).strict(),
});
exports.moduleActionsDto = zod_1.z.object({
    body: zod_1.z.object({
        actions: zod_1.z.array(key).min(1),
    }).strict(),
    params: zod_1.z.object({
        projectId: objectId,
        moduleId: objectId,
    }).strict(),
    query: zod_1.z.object({}).strict(),
});
;
exports.createActionDto = zod_1.z.object({
    body: zod_1.z.object({
        key,
        label: zod_1.z.string().trim().min(2).max(40),
        sortOrder: zod_1.z.number().int().optional(),
        applyToAllModules: zod_1.z.boolean().optional(),
    }).strict(),
    params: zod_1.z.object({}).strict(),
    query: zod_1.z.object({}).strict(),
});
exports.updateActionDto = zod_1.z.object({
    body: zod_1.z.object({
        label: zod_1.z.string().trim().min(2).max(40).optional(),
        sortOrder: zod_1.z.number().int().optional(),
        isActive: zod_1.z.boolean().optional(),
    }).strict(),
    params: zod_1.z.object({
        key: zod_1.z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_-]{1,47}$/),
    }).strict(),
    query: zod_1.z.object({}).strict(),
});
exports.createProjectUserDto = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2).max(100),
        email: zod_1.z.string().trim().toLowerCase().email(),
        password: zod_1.z.string().min(8).max(128),
        roleId: objectId,
    }).strict(),
    params: zod_1.z.object({
        projectId: objectId,
    }).strict(),
    query: zod_1.z.object({}).strict(),
});
exports.assignRoleDto = zod_1.z.object({ roleId: objectId }).strict();
exports.activeDto = zod_1.z.object({ isActive: zod_1.z.boolean() }).strict();
//# sourceMappingURL=rbac.js.map