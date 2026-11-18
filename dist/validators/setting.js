"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlatformMaintenanceDto = exports.updatePlatformDefaultsDto = exports.updatePlatformSecurityDto = exports.updatePlatformGeneralDto = exports.getPlatformDto = exports.logoutAllDto = exports.changePasswordDto = exports.updateMyNotificationsDto = exports.updateMyPreferencesDto = exports.updateProfileDto = exports.getMeDto = void 0;
// validators/settings.ts  (same style as validators/rbac.ts)
const zod_1 = require("zod");
// ── building blocks ──────────────────────────────────────────────────────────
const isTimezone = (tz) => {
    try {
        new Intl.DateTimeFormat("en", { timeZone: tz });
        return true;
    }
    catch {
        return false;
    }
};
const theme = zod_1.z.enum(["light", "dark", "system"]);
const accentColor = zod_1.z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #f96321");
const language = zod_1.z.string().trim().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, "Use a code like en or en-IN");
const timezone = zod_1.z.string().trim().refine(isTimezone, "Unknown timezone, use a name like Asia/Kolkata");
const dateFormat = zod_1.z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]);
const timeFormat = zod_1.z.enum(["12h", "24h"]);
const currency = zod_1.z.string().trim().regex(/^[A-Z]{3}$/, "Use a 3-letter code like INR");
const hhmm = zod_1.z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm, for example 22:00");
const NONEMPTY = "Send at least one field";
const nonEmpty = (o) => Object.values(o).some((v) => v !== undefined);
const noParams = zod_1.z.object({}).strict();
const noQuery = zod_1.z.object({}).strict();
const noBody = zod_1.z.object({}).strict();
const dto = (body, params = noParams, query = noQuery) => zod_1.z.object({ body, params, query });
// ── user level ───────────────────────────────────────────────────────────────
exports.getMeDto = dto(noBody);
exports.updateProfileDto = dto(zod_1.z
    .object({
    name: zod_1.z.string().trim().min(2).max(100).optional(),
    avatar: zod_1.z.string().max(1_000_000).optional(), // "" removes the avatar
})
    .strict()
    .refine(nonEmpty, NONEMPTY));
// null = "reset, use the platform default"
exports.updateMyPreferencesDto = dto(zod_1.z
    .object({
    theme: theme.nullable().optional(),
    accentColor: accentColor.nullable().optional(),
    language: language.nullable().optional(),
    timezone: timezone.nullable().optional(),
    dateFormat: dateFormat.nullable().optional(),
    timeFormat: timeFormat.nullable().optional(),
})
    .strict()
    .refine(nonEmpty, NONEMPTY));
exports.updateMyNotificationsDto = dto(zod_1.z
    .object({
    channels: zod_1.z
        .object({ email: zod_1.z.boolean().optional(), push: zod_1.z.boolean().optional(), inApp: zod_1.z.boolean().optional() })
        .strict()
        .optional(),
    events: zod_1.z
        .object({
        roleChanges: zod_1.z.boolean().optional(),
        projectUpdates: zod_1.z.boolean().optional(),
        systemAlerts: zod_1.z.boolean().optional(),
        productNews: zod_1.z.boolean().optional(),
    })
        .strict()
        .optional(),
    quietHours: zod_1.z
        .object({ enabled: zod_1.z.boolean().optional(), start: hhmm.optional(), end: hhmm.optional() })
        .strict()
        .optional(),
})
    .strict()
    .refine(nonEmpty, NONEMPTY));
exports.changePasswordDto = dto(zod_1.z
    .object({
    currentPassword: zod_1.z.string().min(1).max(128),
    newPassword: zod_1.z.string().min(8).max(128),
})
    .strict());
exports.logoutAllDto = dto(noBody);
// ── platform level (superadmin) ──────────────────────────────────────────────
exports.getPlatformDto = dto(noBody);
exports.updatePlatformGeneralDto = dto(zod_1.z
    .object({
    appName: zod_1.z.string().trim().min(2).max(60).optional(),
    logo: zod_1.z.string().max(1_000_000).optional(),
    supportEmail: zod_1.z.union([zod_1.z.literal(""), zod_1.z.string().trim().email()]).optional(),
})
    .strict()
    .refine(nonEmpty, NONEMPTY));
exports.updatePlatformSecurityDto = dto(zod_1.z
    .object({
    passwordMinLength: zod_1.z.number().int().min(8).max(64).optional(),
    sessionTimeoutMinutes: zod_1.z.number().int().min(5).max(1440).optional(),
    maxLoginAttempts: zod_1.z.number().int().min(3).max(20).optional(),
})
    .strict()
    .refine(nonEmpty, NONEMPTY));
exports.updatePlatformDefaultsDto = dto(zod_1.z
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
    .refine(nonEmpty, NONEMPTY));
exports.updatePlatformMaintenanceDto = dto(zod_1.z
    .object({
    enabled: zod_1.z.boolean().optional(),
    message: zod_1.z.string().trim().max(300).optional(),
})
    .strict()
    .refine(nonEmpty, NONEMPTY));
//# sourceMappingURL=setting.js.map