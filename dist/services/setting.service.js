"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublic = getPublic;
exports.getMe = getMe;
exports.updateProfile = updateProfile;
exports.updateMyPreferences = updateMyPreferences;
exports.updateMyNotifications = updateMyNotifications;
exports.changePassword = changePassword;
exports.logoutAllDevices = logoutAllDevices;
exports.getPlatform = getPlatform;
exports.updatePlatformSection = updatePlatformSection;
// ── ADJUST THESE IMPORTS to match your project (copy the same lines the role
//    service already uses for httpError and audit) ─────────────────────────────
const bcryptjs_1 = __importDefault(require("bcryptjs")); // use "bcrypt" instead if that is what your login service uses
const User_1 = require("../models/User");
const httpError_1 = require("../utils/httpError");
const audit_service_1 = require("../services/audit.service");
// ──────────────────────────────────────────────────────────────────────────────
const setting_1 = require("../models/setting");
// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────
/** First value that is neither undefined nor null. */
function pick(...vals) {
    return vals.find((v) => v !== undefined && v !== null);
}
/**
 * Turns a nested partial body into Mongo dot-paths.
 *   { quietHours: { start: "23:00" } }  ->  $set { "notifications.quietHours.start": "23:00" }
 *   { theme: null }                     ->  $unset { "preferences.theme": "" }
 * Returns null when there is nothing to change.
 */
function buildUpdate(prefix, patch, extraSet = {}) {
    if (typeof patch.accentColor === "string")
        patch = { ...patch, accentColor: patch.accentColor.toLowerCase() };
    const set = {};
    const unset = {};
    const walk = (path, value) => {
        for (const [k, v] of Object.entries(value)) {
            const p = `${path}.${k}`;
            if (v === undefined)
                continue;
            if (v === null)
                unset[p] = "";
            else if (typeof v === "object" && !Array.isArray(v))
                walk(p, v);
            else
                set[p] = v;
        }
    };
    walk(prefix, patch);
    if (!Object.keys(set).length && !Object.keys(unset).length)
        return null;
    const update = {};
    const allSet = { ...set, ...extraSet };
    if (Object.keys(allSet).length)
        update.$set = allSet;
    if (Object.keys(unset).length)
        update.$unset = unset;
    return update;
}
/** Find the document or create it with schema defaults (safe under races). */
async function getOrCreate(model, filter) {
    try {
        return await model
            .findOneAndUpdate(filter, { $setOnInsert: { ...filter } }, { upsert: true, new: true, setDefaultsOnInsert: true })
            .lean();
    }
    catch (e) {
        if (e?.code === 11000)
            return model.findOne(filter).lean();
        throw e;
    }
}
const mergeNotifs = (n) => ({
    channels: { ...setting_1.NOTIF_DEFAULTS.channels, ...(n?.channels ?? {}) },
    events: { ...setting_1.NOTIF_DEFAULTS.events, ...(n?.events ?? {}) },
    quietHours: { ...setting_1.NOTIF_DEFAULTS.quietHours, ...(n?.quietHours ?? {}) },
});
const prefsView = (p) => ({
    theme: p?.theme ?? null,
    accentColor: p?.accentColor ?? null,
    language: p?.language ?? null,
    timezone: p?.timezone ?? null,
    dateFormat: p?.dateFormat ?? null,
    timeFormat: p?.timeFormat ?? null,
});
const platformView = (d) => ({
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
        theme: d.defaults?.theme ?? setting_1.HARD_DEFAULTS.theme,
        accentColor: d.defaults?.accentColor ?? setting_1.HARD_DEFAULTS.accentColor,
        language: d.defaults?.language ?? setting_1.HARD_DEFAULTS.language,
        timezone: d.defaults?.timezone ?? setting_1.HARD_DEFAULTS.timezone,
        dateFormat: d.defaults?.dateFormat ?? setting_1.HARD_DEFAULTS.dateFormat,
        timeFormat: d.defaults?.timeFormat ?? setting_1.HARD_DEFAULTS.timeFormat,
        currency: d.defaults?.currency ?? setting_1.HARD_DEFAULTS.currency,
    },
    maintenance: {
        enabled: d.maintenance?.enabled ?? false,
        message: d.maintenance?.message ?? "",
    },
    updatedAt: d.updatedAt ?? null,
});
const getPlatformDoc = () => getOrCreate(setting_1.PlatformSettings, { key: "global" });
// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC (no login): the login screen needs the app name and maintenance flag
// ─────────────────────────────────────────────────────────────────────────────
async function getPublic() {
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
async function getMe(userId) {
    const [userDoc, us, platform] = await Promise.all([
        User_1.User.findById(userId).select("name email role lastLoginAt").lean(),
        getOrCreate(setting_1.UserSettings, { userId }),
        getPlatformDoc(),
    ]);
    const user = userDoc;
    if (!user)
        throw (0, httpError_1.httpError)(404, "USER_NOT_FOUND", "User not found");
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
                theme: pick(u.theme, d.theme, setting_1.HARD_DEFAULTS.theme),
                accentColor: pick(u.accentColor, d.accentColor, setting_1.HARD_DEFAULTS.accentColor),
                language: pick(u.language, d.language, setting_1.HARD_DEFAULTS.language),
                timezone: pick(u.timezone, d.timezone, setting_1.HARD_DEFAULTS.timezone),
                dateFormat: pick(u.dateFormat, d.dateFormat, setting_1.HARD_DEFAULTS.dateFormat),
                timeFormat: pick(u.timeFormat, d.timeFormat, setting_1.HARD_DEFAULTS.timeFormat),
                currency: pick(d.currency, setting_1.HARD_DEFAULTS.currency),
            },
            notifications: own,
        },
        platform: { appName: pv.general.appName, logo: pv.general.logo, maintenance: pv.maintenance },
    };
}
async function updateProfile(userId, input) {
    const before = (await User_1.User.findById(userId).select("name").lean());
    if (!before)
        throw (0, httpError_1.httpError)(404, "USER_NOT_FOUND", "User not found");
    await getOrCreate(setting_1.UserSettings, { userId });
    if (input.name !== undefined && input.name !== before.name) {
        await User_1.User.updateOne({ _id: userId }, { $set: { name: input.name } });
        await (0, audit_service_1.audit)("settings.profile.updated", { actorId: userId, targetId: userId, before: { name: before.name }, after: { name: input.name } });
    }
    if (input.avatar !== undefined) {
        await setting_1.UserSettings.updateOne({ userId }, { $set: { avatar: input.avatar } });
    }
    const [after, us] = await Promise.all([
        User_1.User.findById(userId).select("name").lean(),
        setting_1.UserSettings.findOne({ userId }).lean(),
    ]);
    return { name: after?.name, avatar: us?.avatar ?? "" };
}
async function updateMyPreferences(userId, patch) {
    const current = await getOrCreate(setting_1.UserSettings, { userId });
    const update = buildUpdate("preferences", patch);
    if (!update)
        return prefsView(current.preferences);
    const after = (await setting_1.UserSettings.findOneAndUpdate({ userId }, update, { new: true }).lean());
    return prefsView(after?.preferences);
}
async function updateMyNotifications(userId, patch) {
    const current = await getOrCreate(setting_1.UserSettings, { userId });
    const update = buildUpdate("notifications", patch);
    if (!update)
        return mergeNotifs(current.notifications);
    const after = (await setting_1.UserSettings.findOneAndUpdate({ userId }, update, { new: true }).lean());
    return mergeNotifs(after?.notifications);
}
/**
 * Changing the password bumps tokenVersion, which makes `authenticate` reject
 * every existing token, including the one used for this request. The frontend
 * must send the user to the login screen afterwards.
 */
async function changePassword(userId, currentPassword, newPassword) {
    const user = await User_1.User.findById(userId).select("+passwordHash tokenVersion");
    if (!user)
        throw (0, httpError_1.httpError)(404, "USER_NOT_FOUND", "User not found");
    const matches = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
    // 400, not 401: a 401 would make the frontend think the session expired.
    if (!matches)
        throw (0, httpError_1.httpError)(400, "WRONG_PASSWORD", "Current password is incorrect");
    if (currentPassword === newPassword)
        throw (0, httpError_1.httpError)(400, "SAME_PASSWORD", "New password must be different from the current one");
    const platform = platformView(await getPlatformDoc());
    if (newPassword.length < platform.security.passwordMinLength) {
        throw (0, httpError_1.httpError)(400, "PASSWORD_TOO_SHORT", `Password must be at least ${platform.security.passwordMinLength} characters`);
    }
    user.passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();
    await (0, audit_service_1.audit)("settings.password.changed", { actorId: userId, targetId: userId });
    return { loggedOut: true };
}
async function logoutAllDevices(userId) {
    await User_1.User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
    await (0, audit_service_1.audit)("settings.sessions.revoked", { actorId: userId, targetId: userId });
    return { loggedOut: true };
}
// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM LEVEL (superadmin)
// ─────────────────────────────────────────────────────────────────────────────
async function getPlatform() {
    return platformView(await getPlatformDoc());
}
async function updatePlatformSection(section, patch, actorId) {
    const before = await getPlatformDoc();
    const update = buildUpdate(section, patch, { updatedBy: actorId });
    if (!update)
        return platformView(before);
    const after = (await setting_1.PlatformSettings.findOneAndUpdate({ key: "global" }, update, { new: true }).lean());
    await (0, audit_service_1.audit)(`settings.platform.${section}.updated`, { actorId, before: before[section], after: after[section] });
    return platformView(after);
}
//# sourceMappingURL=setting.service.js.map