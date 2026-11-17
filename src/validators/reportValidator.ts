import { z } from "zod";

export const reportQuerySchema = z.object({
  type: z.enum(["users"]).default("users"),
  // empty string from the UI dropdown ("All projects") becomes undefined
  projectId: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid projectId")
    .or(z.literal(""))
    .optional()
    .transform((v) => v || undefined),
  range: z.enum(["7d", "30d", "90d", "1y", "all"]).default("30d"),
  status: z.enum(["all", "active", "inactive", "blocked"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(10),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;