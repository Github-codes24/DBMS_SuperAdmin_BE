// validators/settings.ts  (same style as validators/rbac.ts)
import { z } from "zod";

// ── building blocks ──────────────────────────────────────────────────────────

const isTimezone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const theme = z.enum(["light", "dark", "system"]);
const accentColor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #f96321");
const language = z.string().trim().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, "Use a code like en or en-IN");
const timezone = z.string().trim().refine(isTimezone, "Unknown timezone, use a name like Asia/Kolkata");
const dateFormat = z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]);
const timeFormat = z.enum(["12h", "24h"]);
const currency = z.string().trim().regex(/^[A-Z]{3}$/, "Use a 3-letter code like INR");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm, for example 22:00");

const NONEMPTY = "Send at least one field";
const nonEmpty = (o: object) => Object.values(o).some((v) => v !== undefined);

const noParams = z.object({}).strict();
const noQuery = z.object({}).strict();
const noBody = z.object({}).strict();

const dto = (body: z.ZodTypeAny, params: z.ZodTypeAny = noParams, query: z.ZodTypeAny = noQuery) =>
  z.object({ body, params, query });

// ── user level ───────────────────────────────────────────────────────────────
export const getMeDto = dto(noBody);

export const updateProfileDto = dto(
  z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      avatar: z.string().max(1_000_000).optional(), // "" removes the avatar
    })
    .strict()
    .refine(nonEmpty, NONEMPTY),
);

// null = "reset, use the platform default"
export const updateMyPreferencesDto = dto(
  z
    .object({
      theme: theme.nullable().optional(),
      accentColor: accentColor.nullable().optional(),
      language: language.nullable().optional(),
      timezone: timezone.nullable().optional(),
      dateFormat: dateFormat.nullable().optional(),
      timeFormat: timeFormat.nullable().optional(),
    })
    .strict()
    .refine(nonEmpty, NONEMPTY),
);

export const updateMyNotificationsDto = dto(
  z
    .object({
      channels: z
        .object({ email: z.boolean().optional(), push: z.boolean().optional(), inApp: z.boolean().optional() })
        .strict()
        .optional(),
      events: z
        .object({
          roleChanges: z.boolean().optional(),
          projectUpdates: z.boolean().optional(),
          systemAlerts: z.boolean().optional(),
          productNews: z.boolean().optional(),
        })
        .strict()
        .optional(),
      quietHours: z
        .object({ enabled: z.boolean().optional(), start: hhmm.optional(), end: hhmm.optional() })
        .strict()
        .optional(),
    })
    .strict()
    .refine(nonEmpty, NONEMPTY),
);

export const changePasswordDto = dto(
  z
    .object({
      currentPassword: z.string().min(1).max(128),
      newPassword: z.string().min(8).max(128),
    })
    .strict(),
);

export const logoutAllDto = dto(noBody);

// ── platform level (superadmin) ──────────────────────────────────────────────
export const getPlatformDto = dto(noBody);

export const updatePlatformGeneralDto = dto(
  z
    .object({
      appName: z.string().trim().min(2).max(60).optional(),
      logo: z.string().max(1_000_000).optional(),
      supportEmail: z.union([z.literal(""), z.string().trim().email()]).optional(),
    })
    .strict()
    .refine(nonEmpty, NONEMPTY),
);

export const updatePlatformSecurityDto = dto(
  z
    .object({
      passwordMinLength: z.number().int().min(8).max(64).optional(),
      sessionTimeoutMinutes: z.number().int().min(5).max(1440).optional(),
      maxLoginAttempts: z.number().int().min(3).max(20).optional(),
    })
    .strict()
    .refine(nonEmpty, NONEMPTY),
);

export const updatePlatformDefaultsDto = dto(
  z
    .object({
      theme: theme.optional(),
      accentColor: accentColor.optional(),
      language: language.optional(),
      timezone: timezone.optional(),
      dateFormat: dateFormat.optional(),
      timeFormat: timeFormat.optional(),
      currency: currency.optional(),
    })
    .strict()
    .refine(nonEmpty, NONEMPTY),
);

export const updatePlatformMaintenanceDto = dto(
  z
    .object({
      enabled: z.boolean().optional(),
      message: z.string().trim().max(300).optional(),
    })
    .strict()
    .refine(nonEmpty, NONEMPTY),
);