"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPermission = createPermission;
exports.getPermissions = getPermissions;
const permission_1 = require("../models/permission");
async function createPermission(input) {
    return permission_1.Permission.create({
        name: input.name.trim(),
        key: input.key.trim().toLowerCase(),
        description: input.description?.trim() ?? "",
    });
}
async function getPermissions() {
    return permission_1.Permission.find().sort({ name: 1 }).lean();
}
//# sourceMappingURL=permissionService.js.map