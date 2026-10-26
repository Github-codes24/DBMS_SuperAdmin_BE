import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const listUsersSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
    role: z.enum(["superadmin", "admin", "manager", "user"]).optional(),
    isActive: z
      .enum(["true", "false"])
      .transform((val) => val === "true")
      .optional(),
    projectId: z.string().trim().optional(),
    sortBy: z
      .enum(["createdAt", "name", "email", "lastLoginAt"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export const createUserSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name cannot exceed 100 characters"),
      email: z
        .string()
        .trim()
        .email("Enter a valid email address")
        .max(254)
        .transform((email) => email.toLowerCase()),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password cannot exceed 128 characters"),
      role: z.enum(["superadmin", "admin", "manager", "user"]).default("user"),
      projectIds: z.array(z.string().trim()).default([]),
      isActive: z.boolean().default(true),
    })
    .strict(),
  params: z.object({}),
  query: z.object({}),
});

export const getUserSchema = z.object({
  body: z.object({}),
  params: z
    .object({
      id: z.string().regex(objectIdRegex, "Invalid user ID format"),
    })
    .strict(),
  query: z.object({}),
});

export const updateUserSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name cannot exceed 100 characters")
        .optional(),
      email: z
        .string()
        .trim()
        .email("Enter a valid email address")
        .max(254)
        .transform((email) => email.toLowerCase())
        .optional(),
      role: z.enum(["superadmin", "admin", "manager", "user"]).optional(),
      projectIds: z.array(z.string().trim()).optional(),
      isActive: z.boolean().optional(),
    })
    .strict(),
  params: z
    .object({
      id: z.string().regex(objectIdRegex, "Invalid user ID format"),
    })
    .strict(),
  query: z.object({}),
});

export const updateUserStatusSchema = z.object({
  body: z
    .object({
      isActive: z.boolean({
        message: "isActive boolean is required",
      }),
    })
    .strict(),
  params: z
    .object({
      id: z.string().regex(objectIdRegex, "Invalid user ID format"),
    })
    .strict(),
  query: z.object({}),
});

export const resetPasswordSchema = z.object({
  body: z
    .object({
      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password cannot exceed 128 characters"),
    })
    .strict(),
  params: z
    .object({
      id: z.string().regex(objectIdRegex, "Invalid user ID format"),
    })
    .strict(),
  query: z.object({}),
});

export const deleteUserSchema = z.object({
  body: z.object({}),
  params: z
    .object({
      id: z.string().regex(objectIdRegex, "Invalid user ID format"),
    })
    .strict(),
  query: z.object({}),
});

export type ListUsersQuery = z.infer<typeof listUsersSchema>["query"];
export type CreateUserInput = z.infer<typeof createUserSchema>["body"];
export type UpdateUserInput = z.infer<typeof updateUserSchema>["body"];
export type UpdateUserStatusInput = z.infer<
  typeof updateUserStatusSchema
>["body"];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>["body"];
