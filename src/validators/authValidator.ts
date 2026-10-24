
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

export type LoginInput = z.infer<typeof loginSchema>["body"];
