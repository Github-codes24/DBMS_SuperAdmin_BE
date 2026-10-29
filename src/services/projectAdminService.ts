
import { User } from "../models/User.js";
import { Project } from "../models/Project.js";
import { hashPassword } from "../utils/password.js";

interface CreateProjectAdminInput {
  name: string;
  email: string;
  password: string;
  projectId: string;
}

export async function createProjectAdmin(
  input: CreateProjectAdminInput,
) {
  const project = await Project.findById(input.projectId);

  if (!project) {
    throw new Error("Project not found");
  }

  const email = input.email.trim().toLowerCase();

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new Error("A user with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);

  const admin = await User.create({
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
