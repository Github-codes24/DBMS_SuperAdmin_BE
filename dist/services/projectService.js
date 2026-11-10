"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProject = createProject;
exports.getProjectStats = getProjectStats;
exports.getProjects = getProjects;
exports.getProjectById = getProjectById;
exports.getProjectsWithRoles = getProjectsWithRoles;
exports.updateProject = updateProject;
exports.deleteProject = deleteProject;
exports.getMyProjects = getMyProjects;
const mongoose_1 = require("mongoose");
const Project_js_1 = require("../models/Project.js");
const roles_js_1 = require("../models/roles.js");
const User_js_1 = require("../models/User.js");
const counter_js_1 = require("../models/counter.js");
const httpError_js_1 = require("../utils/httpError.js");
const audit_service_js_1 = require("./audit.service.js");
async function getNextProjectId() {
    const exists = await counter_js_1.Counter.exists({ _id: "project" });
    if (!exists) {
        const all = await Project_js_1.Project.find({ projectId: /^PID-\d+$/ })
            .select("projectId")
            .lean();
        const max = all.reduce((m, p) => Math.max(m, Number(p.projectId.slice(4))), 0);
        await counter_js_1.Counter.updateOne({ _id: "project" }, { $setOnInsert: { seq: max } }, { upsert: true }).catch(() => { });
    }
    const c = await counter_js_1.Counter.findOneAndUpdate({ _id: "project" }, { $inc: { seq: 1 } }, { new: true });
    return `PID-${String(c.seq).padStart(3, "0")}`;
}
async function createProject(input) {
    const projectId = await getNextProjectId();
    const adminObjectId = input.adminId && mongoose_1.Types.ObjectId.isValid(input.adminId)
        ? new mongoose_1.Types.ObjectId(input.adminId)
        : null;
    const project = await Project_js_1.Project.create({
        projectId,
        name: input.name.trim(),
        description: input.description?.trim() ?? "",
        logo: input.logo?.trim() ?? "",
        theme: input.theme?.trim() ?? "#f96321",
        startDate: input.startDate ?? "",
        endDate: input.endDate ?? "",
        status: input.status ?? "active",
        type: "tenant",
        createdBy: input.createdBy,
        adminId: adminObjectId,
        panelLinks: input.panelLinks ?? [],
        userTypes: input.userTypes ?? [],
    });
    await (0, audit_service_js_1.audit)("project.created", {
        actorId: input.createdBy,
        projectId: project._id,
        after: { projectId, name: project.name },
    });
    return project;
}
/** Project summary metrics across all projects (for dashboard metric cards). */
async function getProjectStats() {
    const [tenantProjects, projectAdminsCount] = await Promise.all([
        Project_js_1.Project.find({ type: "tenant" }).select("status").lean(),
        User_js_1.User.countDocuments({
            $or: [
                { role: "admin" },
                { "projectRoles.0": { $exists: true } },
            ],
            role: { $ne: "superadmin" },
        }),
    ]);
    return {
        totalProjects: tenantProjects.length,
        activeProjects: tenantProjects.filter((p) => p.status === "active").length,
        completedProjects: tenantProjects.filter((p) => p.status === "completed").length,
        totalProjectAdmins: projectAdminsCount,
        onHoldProjects: tenantProjects.filter((p) => p.status === "on_hold").length,
        upcomingProjects: tenantProjects.filter((p) => p.status === "upcoming").length,
    };
}
/** Project management list: tenant projects only. Supports optional search and status filter. */
async function getProjects(query) {
    const filter = { type: "tenant" };
    if (query?.status && query.status !== "all") {
        filter.status = query.status;
    }
    if (query?.search && query.search.trim()) {
        const s = query.search.trim();
        filter.$or = [
            { name: { $regex: s, $options: "i" } },
            { description: { $regex: s, $options: "i" } },
            { projectId: { $regex: s, $options: "i" } },
        ];
    }
    return Project_js_1.Project.find(filter)
        .populate("adminId", "name email role phone username")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .lean();
}
/** Get single tenant project details by ID or custom projectId */
async function getProjectById(projectId) {
    const query = mongoose_1.Types.ObjectId.isValid(projectId)
        ? { _id: projectId }
        : { projectId: projectId };
    const project = await Project_js_1.Project.findOne(query)
        .populate("adminId", "name email role phone username")
        .populate("createdBy", "name email")
        .lean();
    if (!project)
        throw (0, httpError_js_1.httpError)(404, "PROJECT_NOT_FOUND", "Project not found");
    return project;
}
/** Feeds the platform dropdown: every project with its roles. */
async function getProjectsWithRoles() {
    const [projects, roles] = await Promise.all([
        Project_js_1.Project.find().select("projectId name type status").lean(),
        roles_js_1.Role.find()
            .select("name projectId isSystem isActive")
            .sort({ name: 1 })
            .lean(),
    ]);
    return projects
        .map((p) => ({
        ...p,
        roles: roles
            .filter((r) => String(r.projectId) === String(p._id))
            .map((r) => ({
            _id: r._id,
            name: r.name,
            isSystem: r.isSystem,
            isActive: r.isActive,
        })),
    }))
        .sort((a, b) => a.type === "platform"
        ? -1
        : b.type === "platform"
            ? 1
            : a.name.localeCompare(b.name));
}
async function updateProject(projectId, data, actorId) {
    const query = mongoose_1.Types.ObjectId.isValid(projectId)
        ? { _id: projectId }
        : { projectId: projectId };
    const project = await Project_js_1.Project.findOne(query);
    if (!project)
        throw (0, httpError_js_1.httpError)(404, "PROJECT_NOT_FOUND", "Project not found");
    if (project.type === "platform" && data.status === "inactive")
        throw (0, httpError_js_1.httpError)(403, "PLATFORM_LOCKED", "The platform project cannot be deactivated");
    if (data.name !== undefined)
        project.name = data.name.trim();
    if (data.description !== undefined)
        project.description = data.description.trim();
    if (data.logo !== undefined)
        project.logo = data.logo.trim();
    if (data.theme !== undefined)
        project.theme = data.theme.trim();
    if (data.startDate !== undefined)
        project.startDate = data.startDate;
    if (data.endDate !== undefined)
        project.endDate = data.endDate;
    if (data.status !== undefined)
        project.status = data.status;
    if (data.panelLinks !== undefined)
        project.panelLinks = data.panelLinks;
    if (data.userTypes !== undefined)
        project.userTypes = data.userTypes;
    if (data.adminId !== undefined) {
        if (data.adminId && mongoose_1.Types.ObjectId.isValid(data.adminId)) {
            project.adminId = new mongoose_1.Types.ObjectId(data.adminId);
        }
        else {
            project.adminId = null;
        }
    }
    await project.save();
    await (0, audit_service_js_1.audit)("project.updated", { actorId, projectId: project._id, after: data });
    return project;
}
async function deleteProject(projectId, actorId) {
    const query = mongoose_1.Types.ObjectId.isValid(projectId)
        ? { _id: projectId }
        : { projectId: projectId };
    const project = await Project_js_1.Project.findOne(query);
    if (!project)
        throw (0, httpError_js_1.httpError)(404, "PROJECT_NOT_FOUND", "Project not found");
    if (project.type === "platform")
        throw (0, httpError_js_1.httpError)(403, "PLATFORM_LOCKED", "The platform project cannot be deleted");
    await Project_js_1.Project.deleteOne({ _id: project._id });
    await (0, audit_service_js_1.audit)("project.deleted", {
        actorId,
        projectId: project._id,
        after: { name: project.name },
    });
    return { projectId: project.projectId, name: project.name };
}
async function getMyProjects(userId, userRole) {
    if (userRole === "superadmin") {
        return Project_js_1.Project.find({ type: "tenant" })
            .select("projectId name description status createdAt updatedAt")
            .sort({ createdAt: -1 });
    }
    const user = await User_js_1.User.findById(userId).select("projectRoles");
    if (!user)
        throw (0, httpError_js_1.httpError)(404, "USER_NOT_FOUND", "User not found");
    const ids = user.projectRoles
        .filter((pr) => pr.isActive)
        .map((pr) => pr.projectId);
    if (ids.length === 0)
        return [];
    return Project_js_1.Project.find({
        _id: { $in: ids },
        status: "active",
        type: "tenant",
    }).select("projectId name description status createdAt updatedAt");
}
//# sourceMappingURL=projectService.js.map