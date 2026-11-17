// ── ADJUST THESE IMPORTS to match your project (copy the same lines the role
//    service already uses for httpError and audit) ─────────────────────────────
import bcrypt from "bcryptjs"; // use "bcrypt" instead if that is what your login service uses
import { User } from "../models/User";
import { httpError } from "../utils/httpError";
import { audit } from "../services/audit.service"
// ──────────────────────────────────────────────────────────────────────────────
import {
  UserSettings,
  PlatformSettings,
  HARD_DEFAULTS,
  NOTIF_DEFAULTS,
} from "../models/setting"

type Obj = Record<string, any>;

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

/** First value that is neither undefined nor null. */
function pick<T>(...vals: Array<T | null | undefined>): T {
  return vals.find((v) => v !== undefined && v !== null) as T;
}

/**
 * Turns a nested partial body into Mongo dot-paths.
 *   { quietHours: { start: "23:00" } }  ->  $set { "notifications.quietHours.start": "23:00" }
 *   { theme: null }                     ->  $unset { "preferences.theme": "" }
 * Returns null when there is nothing to change.
 */
function buildUpdate(prefix: string, patch: Obj, extraSet: Obj = {}): Obj | null {
  if (typeof patch.accentColor === "string") patch = { ...patch, accentColor: patch.accentColor.toLowerCase() };
  const set: Obj = {};
  const unset: Obj = {};

  const walk = (path: string, value: Obj) => {
    for (const [k, v] of Object.entries(value)) {
      const p = `${path}.${k}`;
      if (v === undefined) continue;
      if (v === null) unset[p] = "";
      else if (typeof v === "object" && !Array.isArray(v)) walk(p, v);
      else set[p] = v;
    }
  };
  walk(prefix, patch);

  if (!Object.keys(set).length && !Object.keys(unset).length) return null;

  const update: Obj = {};
  const allSet = { ...set, ...extraSet };
  if (Object.keys(allSet).length) update.$set = allSet;
  if (Object.keys(unset).length) update.$unset = unset;
  return update;
}

/** Find the document or create it with schema defaults (safe under races). */
async function getOrCreate(model: any, filter: Obj): Promise<Obj> {
  try {
    return await model
      .findOneAndUpdate(filter, { $setOnInsert: { ...filter } }, { upsert: true, new: true, setDefaultsOnInsert: true })
      .lean();
  } catch (e: any) {
    if (e?.code === 11000) return model.findOne(filter).lean();
    throw e;
  }
}

const mergeNotifs = (n?: Obj) => ({
  channels: { ...NOTIF_DEFAULTS.channels, ...(n?.channels ?? {}) },
  events: { ...NOTIF_DEFAULTS.events, ...(n?.events ?? {}) },
  quietHours: { ...NOTIF_DEFAULTS.quietHours, ...(n?.quietHours ?? {}) },
});

const prefsView = (p?: Obj) => ({
  theme: p?.theme ?? null,
  accentColor: p?.accentColor ?? null,
  language: p?.language ?? null,
  timezone: p?.timezone ?? null,
  dateFormat: p?.dateFormat ?? null,
  timeFormat: p?.timeFormat ?? null,
});

const platformView = (d: Obj) => ({
  general: {
    appName: d.general?.appName ?? "DBMS SuperAdmin",
    logo: d.general?.logo ?? "",
    supportEmail: d.general?.supportEmail ?? "",
  },
  security: {
    passwordMinLength: d.security?.passwordMinLength ?? 8,
    sessionTimeoutMinutes: d.security?.sessionTimeoutMinutes ?? 60,
    maxLoginAttempts: d.security?.maxLoginAttempts ?? 5,
  },
  defaults: {
    theme: d.defaults?.theme ?? HARD_DEFAULTS.theme,
    accentColor: d.defaults?.accentColor ?? HARD_DEFAULTS.accentColor,
    language: d.defaults?.language ?? HARD_DEFAULTS.language,
    timezone: d.defaults?.timezone ?? HARD_DEFAULTS.timezone,
    dateFormat: d.defaults?.dateFormat ?? HARD_DEFAULTS.dateFormat,
    timeFormat: d.defaults?.timeFormat ?? HARD_DEFAULTS.timeFormat,
    currency: d.defaults?.currency ?? HARD_DEFAULTS.currency,
  },
  maintenance: {
    enabled: d.maintenance?.enabled ?? false,
    message: d.maintenance?.message ?? "",
  },
  updatedAt: d.updatedAt ?? null,
});

const getPlatformDoc = () => getOrCreate(PlatformSettings, { key: "global" });

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC (no login): the login screen needs the app name and maintenance flag
// ─────────────────────────────────────────────────────────────────────────────
export async function getPublic() {
  const v = platformView(await getPlatformDoc());
  return { appName: v.general.appName, logo: v.general.logo, maintenance: v.maintenance };
}

// ─────────────────────────────────────────────────────────────────────────────
// USER LEVEL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Everything the app needs at start-up. For each setting the first value that
 * is set wins: user -> platform default -> built-in default.
 */
export async function getMe(userId: string) {
  const [userDoc, us, platform] = await Promise.all([
    User.findById(userId).select("name email role lastLoginAt").lean(),
    getOrCreate(UserSettings, { userId }),
    getPlatformDoc(),
  ]);
  const user = userDoc as Obj | null;
  if (!user) throw httpError(404, "USER_NOT_FOUND", "User not found");

  const u = us.preferences ?? {};
  const d = platform.defaults ?? {};
  const own = mergeNotifs(us.notifications);
  const pv = platformView(platform);

  return {
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      lastLoginAt: user.lastLoginAt ?? null,
    },
    avatar: us.avatar ?? "",
    preferences: prefsView(u),
    notifications: own,
    effective: {
      preferences: {
        theme: pick(u.theme, d.theme, HARD_DEFAULTS.theme),
        accentColor: pick(u.accentColor, d.accentColor, HARD_DEFAULTS.accentColor),
        language: pick(u.language, d.language, HARD_DEFAULTS.language),
        timezone: pick(u.timezone, d.timezone, HARD_DEFAULTS.timezone),
        dateFormat: pick(u.dateFormat, d.dateFormat, HARD_DEFAULTS.dateFormat),
        timeFormat: pick(u.timeFormat, d.timeFormat, HARD_DEFAULTS.timeFormat),
        currency: pick(d.currency, HARD_DEFAULTS.currency),
      },
      notifications: own,
    },
    platform: { appName: pv.general.appName, logo: pv.general.logo, maintenance: pv.maintenance },
  };
}

export async function updateProfile(userId: string, input: { name?: string; avatar?: string }) {
  const before = (await User.findById(userId).select("name").lean()) as Obj | null;
  if (!before) throw httpError(404, "USER_NOT_FOUND", "User not found");
  await getOrCreate(UserSettings, { userId });

  if (input.name !== undefined && input.name !== before.name) {
    await User.updateOne({ _id: userId }, { $set: { name: input.name } });
    await audit("settings.profile.updated", { actorId: userId, targetId: userId, before: { name: before.name }, after: { name: input.name } });
  }
  if (input.avatar !== undefined) {
    await UserSettings.updateOne({ userId }, { $set: { avatar: input.avatar } });
  }

  const [after, us] = await Promise.all([
    User.findById(userId).select("name").lean() as Promise<Obj | null>,
    UserSettings.findOne({ userId }).lean() as Promise<Obj | null>,
  ]);
  return { name: after?.name, avatar: us?.avatar ?? "" };
}

export async function updateMyPreferences(userId: string, patch: Obj) {
  const current = await getOrCreate(UserSettings, { userId });
  const update = buildUpdate("preferences", patch);
  if (!update) return prefsView(current.preferences);
  const after = (await UserSettings.findOneAndUpdate({ userId }, update, { new: true }).lean()) as Obj | null;
  return prefsView(after?.preferences);
}

export async function updateMyNotifications(userId: string, patch: Obj) {
  const current = await getOrCreate(UserSettings, { userId });
  const update = buildUpdate("notifications", patch);
  if (!update) return mergeNotifs(current.notifications);
  const after = (await UserSettings.findOneAndUpdate({ userId }, update, { new: true }).lean()) as Obj | null;
  return mergeNotifs(after?.notifications);
}

/**
 * Changing the password bumps tokenVersion, which makes `authenticate` reject
 * every existing token, including the one used for this request. The frontend
 * must send the user to the login screen afterwards.
 */
export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user: any = await User.findById(userId).select("+passwordHash tokenVersion");
  if (!user) throw httpError(404, "USER_NOT_FOUND", "User not found");

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  // 400, not 401: a 401 would make the frontend think the session expired.
  if (!matches) throw httpError(400, "WRONG_PASSWORD", "Current password is incorrect");
  if (currentPassword === newPassword) throw httpError(400, "SAME_PASSWORD", "New password must be different from the current one");

  const platform = platformView(await getPlatformDoc());
  if (newPassword.length < platform.security.passwordMinLength) {
    throw httpError(400, "PASSWORD_TOO_SHORT", `Password must be at least ${platform.security.passwordMinLength} characters`);
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  await audit("settings.password.changed", { actorId: userId, targetId: userId });
  return { loggedOut: true };
}

export async function logoutAllDevices(userId: string) {
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
  await audit("settings.sessions.revoked", { actorId: userId, targetId: userId });
  return { loggedOut: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM LEVEL (superadmin)
// ─────────────────────────────────────────────────────────────────────────────
export async function getPlatform() {
  return platformView(await getPlatformDoc());
}

export type PlatformSection = "general" | "security" | "defaults" | "maintenance";

export async function updatePlatformSection(section: PlatformSection, patch: Obj, actorId: string) {
  const before = await getPlatformDoc();
  const update = buildUpdate(section, patch, { updatedBy: actorId });
  if (!update) return platformView(before);

  const after = (await PlatformSettings.findOneAndUpdate({ key: "global" }, update, { new: true }).lean()) as Obj;
  await audit(`settings.platform.${section}.updated`, { actorId, before: before[section], after: after[section] });
  return platformView(after);
}