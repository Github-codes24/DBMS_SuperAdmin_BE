
import mongoose from "mongoose";
import { Project } from "../models/Project.js";
import {Role} from "../models/roles.js"
import {User} from "../models/User.js"
import { Types } from "mongoose";

interface CreateProjectInput {
  name: string;
  description?: string;
  createdBy: string;
}

const COUNTER_ID = new mongoose.Types.ObjectId();
const COUNTER_PROJECT_ID = "__PROJECT_COUNTER__";

async function getNextProjectId(): Promise<string> {
  // Find the internal counter document.
  let counter = await Project.collection.findOne({
    projectId: COUNTER_PROJECT_ID,
  });

  if (!counter) {
    // Find the highest existing project ID.
    const projects = await Project.find({
      projectId: /^PID-\d+$/,
    })
      .select("projectId")
      .lean();

    const maxId = projects.reduce((max, project) => {
      const match = project.projectId.match(/^PID-(\d+)$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);

    try {
      await Project.collection.insertOne({
        _id: COUNTER_ID,
        projectId: COUNTER_PROJECT_ID,
        seq: maxId,
      });
    } catch (error: unknown) {
      const duplicateKey =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000;

      if (!duplicateKey) {
        throw error;
      }
    }
  }

  // Read the counter's actual ObjectId.
  counter = await Project.collection.findOne({
    projectId: COUNTER_PROJECT_ID,
  });

  if (!counter) {
    throw new Error("Project ID counter not found");
  }

  // Atomically increment the counter.
  const result = await Project.collection.findOneAndUpdate(
    { _id: counter._id },
    { $inc: { seq: 1 } },
    { returnDocument: "after" },
  );

  // Compatible with MongoDB driver versions returning ModifyResult.
  const updatedCounter =
    result && "value" in result ? result.value : result;

  if (
    !updatedCounter ||
    typeof updatedCounter.seq !== "number"
  ) {
    throw new Error("Could not generate project ID");
  }

  return `PID-${String(updatedCounter.seq).padStart(3, "0")}`;
}

export async function createProject(input: CreateProjectInput) {
  const projectId = await getNextProjectId();

  return Project.create({
    projectId,
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    createdBy: input.createdBy,
  });
}

// export async function getProjects() {
//   return Project.find({
//     projectId: /^PID-\d+$/,
//   })
//     .sort({ createdAt: -1 })
//     .lean();
// }
// import { User } from "../models/User";
// import { Project } from "../models/Project";
// import { Role } from "../models/Role";

export async function getMyProjects(userId: string, userRole: string) {

  // SuperAdmin can see all projects
  if (userRole === "superadmin") {
    const projects = await Project.find()
      .select("name description isActive createdAt updatedAt")
      .sort({ createdAt: -1 });

    return projects;
  }
 // Project Admin / normal user → only their projects
  const user = await User.findById(userId).select("projectIds");

  if (!user) {
    throw Object.assign(new Error("User not found"), {
      statusCode: 404,
      code: "USER_NOT_FOUND",
    });
  }
  

  const objectIds = user.projectIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  if (objectIds.length === 0) {
    return [];
  }

  console.log("User projectIds →", user.projectIds);
  console.log("Converted ObjectIds →", objectIds);

  if (!user.projectIds || user.projectIds.length === 0) {
    return [];
  }


  const projects = await Project.find({
    _id: { $in: user.projectIds },
  }).select("name description isActive createdAt updatedAt");

  return projects;
}

