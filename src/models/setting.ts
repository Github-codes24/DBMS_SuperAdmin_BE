import mongoose, { Schema } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// Shared constants
// ─────────────────────────────────────────────────────────────────────────────
export const THEMES = ["light", "dark", "system"] as const;
export const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;
export const TIME_FORMATS = ["12h", "24h"] as const;

/** Last-resort values when neither the user nor the platform has set anything. */
export const HARD_DEFAULTS = {
  theme: "system",
  accentColor: "#f96321",
  language: "en",
  timezone: "Asia/Kolkata",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "12h",
  currency: "INR",
} as const;

export const NOTIF_DEFAULTS = {
  channels: { email: true, push: true, inApp: true },
  events: { roleChanges: true, projectUpdates: true, systemAlerts: true, productNews: false },
  quietHours: { enabled: false, start: "22:00", end: "07:00" },
};

const bool = (def: boolean) => ({ type: Boolean, default: def });

// ─────────────────────────────────────────────────────────────────────────────
// 1. UserSettings: one document per user (created on first read)
//    preferences.* have NO default on purpose: "unset" means "inherit from
//    platform default". Notifications are always concrete.
// ─────────────────────────────────────────────────────────────────────────────
const userSettingsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    avatar: { type: String, default: "" },
    preferences: {
      theme: { type: String, enum: [...THEMES] },
      accentColor: { type: String, trim: true, lowercase: true },
      language: { type: String, trim: true },
      timezone: { type: String, trim: true },
      dateFormat: { type: String, enum: [...DATE_FORMATS] },
      timeFormat: { type: String, enum: [...TIME_FORMATS] },
    },
    notifications: {
      channels: {
        email: bool(NOTIF_DEFAULTS.channels.email),
        push: bool(NOTIF_DEFAULTS.channels.push),
        inApp: bool(NOTIF_DEFAULTS.channels.inApp),
      },
      events: {
        roleChanges: bool(NOTIF_DEFAULTS.events.roleChanges),
        projectUpdates: bool(NOTIF_DEFAULTS.events.projectUpdates),
        systemAlerts: bool(NOTIF_DEFAULTS.events.systemAlerts),
        productNews: bool(NOTIF_DEFAULTS.events.productNews),
      },
      quietHours: {
        enabled: bool(NOTIF_DEFAULTS.quietHours.enabled),
        start: { type: String, default: NOTIF_DEFAULTS.quietHours.start },
        end: { type: String, default: NOTIF_DEFAULTS.quietHours.end },
      },
    },
  },
  { timestamps: true, collection: "user_settings" },
);
export const UserSettings = mongoose.model("UserSettings", userSettingsSchema);

// ─────────────────────────────────────────────────────────────────────────────
// 2. PlatformSettings: a single document (key = "global")
// ─────────────────────────────────────────────────────────────────────────────
const platformSettingsSchema = new Schema(
  {
    key: { type: String, default: "global", unique: true },
    general: {
      appName: { type: String, trim: true, default: "DBMS SuperAdmin" },
      logo: { type: String, default: "" },
      supportEmail: { type: String, trim: true, default: "" },
    },
    security: {
      passwordMinLength: { type: Number, default: 8 },
      sessionTimeoutMinutes: { type: Number, default: 60 },
      maxLoginAttempts: { type: Number, default: 5 },
    },
    defaults: {
      theme: { type: String, enum: [...THEMES], default: HARD_DEFAULTS.theme },
      accentColor: { type: String, lowercase: true, default: HARD_DEFAULTS.accentColor },
      language: { type: String, default: HARD_DEFAULTS.language },
      timezone: { type: String, default: HARD_DEFAULTS.timezone },
      dateFormat: { type: String, enum: [...DATE_FORMATS], default: HARD_DEFAULTS.dateFormat },
      timeFormat: { type: String, enum: [...TIME_FORMATS], default: HARD_DEFAULTS.timeFormat },
      currency: { type: String, default: HARD_DEFAULTS.currency },
    },
    maintenance: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: "" },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "platform_settings" },
);
export const PlatformSettings = mongoose.model("PlatformSettings", platformSettingsSchema);