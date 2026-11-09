import { Types } from "mongoose";
import { Project } from "../models/Project.js";
import { Role } from "../models/roles.js";
import { User } from "../models/User.js";
import { Counter } from "../models/counter.js";
import { httpError } from "../utils/httpError.js";
import { audit } from "./audit.service.js";

type PanelLink = { name: string; url: string };
type UserType = { role: string; count: number };

type FrontendAppInput = {
  appKey: string;
  name: string;
  baseUrl: string;
  allowedRoles?: string[];
  ssoCallbackPath?: string;
  isDefault?: boolean;
};

type BackendConfigInput = {
  baseUrl?: string;
  bridgePrefix?: string;
  authType?: "api_key" | "hmac" | "service_jwt";
  secretKeyId?: string;
  timeoutMs?: number;
  retryAttempts?: number;
};

type ProjectInput = {
  name: string;
  projectCode?: string;
  description?: string;
  logo?: string;
  theme?: string;
  startDate?: string;
  endDate?: string;
  status?: "active" | "inactive" | "upcoming" | "completed" | "on_hold";
  integrationStatus?: "unlinked" | "registered" | "connected" | "sync_failed";
  adminId?: string;
  panelLinks?: PanelLink[];
  userTypes?: UserType[];
  frontendApps?: FrontendAppInput[];
  backendConfig?: BackendConfigInput;
  availableModules?: string[];
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
  const project = await Project.create({
    projectId,
    projectCode: input.projectCode ? input.projectCode.trim().toUpperCase() : "",
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    logo: input.logo?.trim() ?? "",
    theme: input.theme?.trim() ?? "#f96321",
    startDate: input.startDate ?? "",
    endDate: input.endDate ?? "",
    status: input.status ?? "active",
    integrationStatus: input.integrationStatus ?? "unlinked",
    type: "tenant",
    createdBy: input.createdBy,
    panelLinks: input.panelLinks ?? [],
    userTypes: input.userTypes ?? [],
    frontendApps: input.frontendApps ?? [],
    backendConfig: input.backendConfig ?? {
      baseUrl: "",
      bridgePrefix: "/api/v1/platform-bridge",
      authType: "api_key",
      secretKeyId: "",
      timeoutMs: 5000,
      retryAttempts: 2,
    },
    availableModules: input.availableModules ?? [],
  });
  await audit("project.created", {
    actorId: input.createdBy,
    projectId: project._id,
    after: { projectId, name: project.name },
  });
  return project;
}

/** Project management list: tenant projects only. */
export async function getProjects() {
  return Project.find({ type: "tenant" }).sort({ createdAt: -1 }).lean();
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

export async function updateProject(
  projectId: string,
  data: ProjectUpdate,
  actorId: string,
) {
  const project = await Project.findById(projectId);
  if (!project) throw httpError(404, "PROJECT_NOT_FOUND", "Project not found");
  if (project.type === "platform" && data.status === "inactive")
    throw httpError(
      403,
      "PLATFORM_LOCKED",
      "The platform project cannot be deactivated",
    );

  if (data.name !== undefined) project.name = data.name.trim();
  if (data.projectCode !== undefined)
    project.projectCode = data.projectCode ? data.projectCode.trim().toUpperCase() : "";
  if (data.description !== undefined)
    project.description = data.description.trim();
  if (data.logo !== undefined) project.logo = data.logo.trim();
  if (data.theme !== undefined) project.theme = data.theme.trim();
  if (data.startDate !== undefined) project.startDate = data.startDate;
  if (data.endDate !== undefined) project.endDate = data.endDate;
  if (data.status !== undefined) project.status = data.status;
  if (data.integrationStatus !== undefined)
    project.integrationStatus = data.integrationStatus as any;
  if (data.panelLinks !== undefined)
    project.panelLinks = data.panelLinks as any;
  if (data.userTypes !== undefined) project.userTypes = data.userTypes as any;
  if (data.frontendApps !== undefined)
    project.frontendApps = data.frontendApps as any;
  if (data.backendConfig !== undefined)
    project.backendConfig = {
      ...(project.backendConfig || {}),
      ...data.backendConfig,
    } as any;
  if (data.availableModules !== undefined)
    project.availableModules = data.availableModules as any;

  await project.save();
  await audit("project.updated", { actorId, projectId, after: data });
  return project;
}

export async function deleteProject(projectId: string, actorId: string) {
  const project = await Project.findById(projectId);
  if (!project) throw httpError(404, "PROJECT_NOT_FOUND", "Project not found");
  if (project.type === "platform")
    throw httpError(
      403,
      "PLATFORM_LOCKED",
      "The platform project cannot be deleted",
    );

  await Project.findByIdAndDelete(projectId);
  await audit("project.deleted", {
    actorId,
    projectId,
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
