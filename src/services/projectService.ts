import { Types } from "mongoose";
import { Project } from "../models/Project.js";
import { Role } from "../models/roles.js";
import { User } from "../models/User.js";
import { Counter } from "../models/counter.js";
import { httpError } from "../utils/httpError.js";
import { audit } from "./audit.service.js";

async function getNextProjectId(): Promise<string> {
  // First use: start from the highest existing PID-xxx so numbering continues
  const exists = await Counter.exists({ _id: "project" });
  if (!exists) {
    const all = await Project.find({ projectId: /^PID-\d+$/ }).select("projectId").lean();
    const max = all.reduce((m, p) => Math.max(m, Number(p.projectId.slice(4))), 0);
    await Counter.updateOne({ _id: "project" }, { $setOnInsert: { seq: max } }, { upsert: true }).catch(() => {});
  }
  const c = await Counter.findOneAndUpdate({ _id: "project" }, { $inc: { seq: 1 } }, { new: true });
  return `PID-${String(c!.seq).padStart(3, "0")}`;
}

export async function createProject(input: { name: string; description?: string; createdBy: string }) {
  const projectId = await getNextProjectId();
  const project = await Project.create({
    projectId,
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    type: "tenant",                     // set here, never from the request body
    createdBy: input.createdBy,
  });
  await audit("project.created",{ 
actorId: input.createdBy,
     projectId: project._id, after:{
       projectId,
         name: project.name
         } 
        });
  return project;
}

/** Project management list: tenants only. */
export async function getProjects() {
  return Project.find({ type: "tenant" }).
  sort({ createdAt: -1 }).
  lean();
}

/** Feeds the "Platform > SuperAdmin" dropdown: every project with its roles. */
export async function getProjectsWithRoles() {
  const [projects, roles] = await Promise.all([
    Project.find().
    select("projectId name type status").lean(),
    Role.find().select("name projectId isSystem isActive").
    sort({ name: 1 }).lean(),
  ]);
  return projects
    .map((p) => ({
      ...p,
      roles: roles.filter((r) => String(r.projectId) === String(p._id)).map((r) => ({ _id: r._id, name: r.name, isSystem: r.isSystem, isActive: r.isActive })),
    }))
    .sort((a, b) => (a.type === "platform" ? -1 : b.type === "platform" ? 1 : a.name.localeCompare(b.name)));
}

export async function updateProject(
  projectId: string,
  data: { name?: string; description?: string; status?: "active" | "inactive" },
  actorId: string,
) {
  const project = await Project.findById(projectId);
  if (!project) throw httpError(404, "PROJECT_NOT_FOUND", "Project not found");
  if (project.type === "platform" && data.status === "inactive") throw httpError(403, "PLATFORM_LOCKED", "The platform project cannot be deactivated");

  if (data.name !== undefined) project.name = data.name.trim();
  if (data.description !== undefined) project.description = data.description.trim();
  if (data.status !== undefined) project.status = data.status;
  await project.save();
  await audit("project.updated", { actorId, projectId, after: data });
  return project;
}

export async function getMyProjects(userId: string, userRole: string) {
  if (userRole === "superadmin") {
    return Project.find({ type: "tenant" }).
    select("projectId name description status createdAt updatedAt").
    sort({ createdAt: -1 });
  }
  const user = await User.findById(userId).select("projectRoles");
  if (!user) throw httpError(404, "USER_NOT_FOUND", "User not found");

  const ids = user.projectRoles.filter((pr) => pr.isActive).map((pr) => pr.projectId);
  if (ids.length === 0) return [];
  return Project.find({ _id: { $in: ids },
     status: "active",
      type: "tenant" })
    .select("projectId name description status createdAt updatedAt");
}