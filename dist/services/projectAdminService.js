"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectAdmin = createProjectAdmin;
const User_js_1 = require("../models/User.js");
const Project_js_1 = require("../models/Project.js");
const password_js_1 = require("../utils/password.js");
async function createProjectAdmin(input) {
    const project = await Project_js_1.Project.findById(input.projectId);
    if (!project) {
        throw new Error("Project not found");
    }
    const email = input.email.trim().toLowerCase();
    const existingUser = await User_js_1.User.findOne({ email });
    if (existingUser) {
        throw new Error("A user with this email already exists");
    }
    const passwordHash = await (0, password_js_1.hashPassword)(input.password);
    const admin = await User_js_1.User.create({
        name: input.name.trim(),
        email,
        passwordHash,
        role: "admin",
        projectIds: [project._id.toString()],
        isActive: true,
    });
    return {
        id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
        role: admin.role,
        projectIds: admin.projectIds,
        isActive: admin.isActive,
    };
}
//# sourceMappingURL=projectAdminService.js.map