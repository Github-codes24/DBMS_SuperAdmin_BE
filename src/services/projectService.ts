import { Types } from "mongoose";
import { Project } from "../models/Project.js";
import { Role } from "../models/roles.js";
import { User } from "../models/User.js";
import { Counter } from "../models/counter.js";
import { httpError } from "../utils/httpError.js";
import { audit } from "./audit.service.js";

type PanelLink = { name: string; url: string };
type UserType = { role: string; count: number };

type ProjectInput = {
  name: string;
  description?: string;
  logo?: string;
  theme?: string;
  startDate?: string;
  endDate?: string;
  status?: "active" | "inactive" | "upcoming" | "completed" | "on_hold";
  adminId?: string;
  panelLinks?: PanelLink[];
  userTypes?: UserType[];
  createdBy: string;
};

type ProjectUpdate = Omit<ProjectInput, "createdBy"> & { actorId?: string };

async function getNextProjectId(): Promise<string> {
  const exists = await Counter.exists({ _id: "project" });
  if (!exists) {
    const all = await Project.find({ projectId: /^PID-\d+$/ })
      .select("projectId")
      .lean();
    const max = all.reduce(
      (m, p) => Math.max(m, Number(p.projectId.slice(4))),
      0,
    );
    await Counter.updateOne(
      { _id: "project" },
      { $setOnInsert: { seq: max } },
      { upsert: true },
    ).catch(() => {});
  }
  const c = await Counter.findOneAndUpdate(
    { _id: "project" },
    { $inc: { seq: 1 } },
    { new: true },
  );
  return `PID-${String(c!.seq).padStart(3, "0")}`;
}

export async function createProject(input: ProjectInput) {
  const projectId = await getNextProjectId();
  const adminObjectId =
    input.adminId && Types.ObjectId.isValid(input.adminId)
      ? new Types.ObjectId(input.adminId)
      : null;

  const project = await Project.create({
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
  await audit("project.created", {
    actorId: input.createdBy,
    projectId: project._id,
    after: { projectId, name: project.name },
  });
  return project;
}

/** Project summary metrics across all projects (for dashboard metric cards). */
export async function getProjectStats() {
  const [tenantProjects, projectAdminsCount] = await Promise.all([
    Project.find({ type: "tenant" }).select("status").lean(),
    User.countDocuments({
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
export async function getProjects(query?: { search?: string; status?: string }) {
  const filter: Record<string, any> = { type: "tenant" };
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
  return Project.find(filter)
    .populate("adminId", "name email role phone username")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 })
    .lean();
}

/** Get single tenant project details by ID or custom projectId */
export async function getProjectById(projectId: string) {
  const query = Types.ObjectId.isValid(projectId)
    ? { _id: projectId }
    : { projectId: projectId };
  const project = await Project.findOne(query)
    .populate("adminId", "name email role phone username")
    .populate("createdBy", "name email")
    .lean();
  if (!project) throw httpError(404, "PROJECT_NOT_FOUND", "Project not found");
  return project;
}

/** Feeds the platform dropdown: every project with its roles. */
export async function getProjectsWithRoles() {
  const [projects, roles] = await Promise.all([
    Project.find().select("projectId name type status").lean(),
    Role.find()
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
    .sort((a, b) =>
      a.type === "platform"
        ? -1
        : b.type === "platform"
          ? 1
          : a.name.localeCompare(b.name),
    );
}
/*  get role for the particular project*/
export async function getRolesByProject(projectId: string) {
  if (!Types.ObjectId.isValid(projectId)) {
    throw new Error("Invalid projectId");
  }

  const roles = await Role.find({ projectId })
    .select("name description moduleKeys isSystem isActive")
    .sort({ name: 1 })
    .lean();

  return roles;
}
export async function updateProject(
  projectId: string,
  data: ProjectUpdate,
  actorId: string,
) {
  const query = Types.ObjectId.isValid(projectId)
    ? { _id: projectId }
    : { projectId: projectId };
  const project = await Project.findOne(query);
  if (!project) throw httpError(404, "PROJECT_NOT_FOUND", "Project not found");
  if (project.type === "platform" && data.status === "inactive")
    throw httpError(
      403,
      "PLATFORM_LOCKED",
      "The platform project cannot be deactivated",
    );

  if (data.name !== undefined) project.name = data.name.trim();
  if (data.description !== undefined)
    project.description = data.description.trim();
  if (data.logo !== undefined) project.logo = data.logo.trim();
  if (data.theme !== undefined) project.theme = data.theme.trim();
  if (data.startDate !== undefined) project.startDate = data.startDate;
  if (data.endDate !== undefined) project.endDate = data.endDate;
  if (data.status !== undefined) project.status = data.status;
  if (data.panelLinks !== undefined)
    project.panelLinks = data.panelLinks as any;
  if (data.userTypes !== undefined) project.userTypes = data.userTypes as any;
  if (data.adminId !== undefined) {
    if (data.adminId && Types.ObjectId.isValid(data.adminId)) {
      project.adminId = new Types.ObjectId(data.adminId) as any;
    } else {
      project.adminId = null as any;
    }
  }

  await project.save();
  await audit("project.updated", { actorId, projectId: project._id, after: data });
  return project;
}

export async function deleteProject(projectId: string, actorId: string) {
  const query = Types.ObjectId.isValid(projectId)
    ? { _id: projectId }
    : { projectId: projectId };
  const project = await Project.findOne(query);
  if (!project) throw httpError(404, "PROJECT_NOT_FOUND", "Project not found");
  if (project.type === "platform")
    throw httpError(
      403,
      "PLATFORM_LOCKED",
      "The platform project cannot be deleted",
    );

  await Project.deleteOne({ _id: project._id });
  await audit("project.deleted", {
    actorId,
    projectId: project._id,
    after: { name: project.name },
  });
  return { projectId: project.projectId, name: project.name };
}

export async function getMyProjects(userId: string, userRole: string) {
  if (userRole === "superadmin") {
    return Project.find({ type: "tenant" })
      .select("projectId name description status createdAt updatedAt")
      .sort({ createdAt: -1 });
  }
  const user = await User.findById(userId).select("projectRoles");
  if (!user) throw httpError(404, "USER_NOT_FOUND", "User not found");

  const ids = user.projectRoles
    .filter((pr) => pr.isActive)
    .map((pr) => pr.projectId);
  if (ids.length === 0) return [];
  return Project.find({
    _id: { $in: ids },
    status: "active",
    type: "tenant",
  }).select("projectId name description status createdAt updatedAt");
}
