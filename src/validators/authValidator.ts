
import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .email("Enter a valid email address")
      .max(254)
      .transform((email) => email.toLowerCase()),

    password: z
      .string()
      .min(1, "Password is required")
      .max(128, "Password is too long"),
  }).strict(),

  params: z.object({}),
  query: z.object({}),
});



export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z
      .string()
      .min(1, "Current password is required"),

    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters long")
      .max(128, "New password must not exceed 72 characters"),
  }),
});

export type ChangePasswordInput = z.infer< typeof changePasswordSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
