import { z } from "zod";

export const createProjectAdminSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email(),
    password: z.string().min(8),
  }),
  params: z.object({
    projectId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid project ID"),
  }),
});