
import { Permission } from "../models/permission";

export async function createPermission(input: {
  name: string;
  key: string;
  description?: string;
}) {
  return Permission.create({
    name: input.name.trim(),
    key: input.key.trim().toLowerCase(),
    description: input.description?.trim() ?? "",
  });
}

export async function getPermissions() {
  return Permission.find().sort({ name: 1 }).lean();
}
