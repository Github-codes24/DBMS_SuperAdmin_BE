"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformSettings = exports.UserSettings = exports.NOTIF_DEFAULTS = exports.HARD_DEFAULTS = exports.TIME_FORMATS = exports.DATE_FORMATS = exports.THEMES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// ─────────────────────────────────────────────────────────────────────────────
// Shared constants
// ─────────────────────────────────────────────────────────────────────────────
exports.THEMES = ["light", "dark", "system"];
exports.DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];
exports.TIME_FORMATS = ["12h", "24h"];
/** Last-resort values when neither the user nor the platform has set anything. */
exports.HARD_DEFAULTS = {
    theme: "system",
    accentColor: "#f96321",
    language: "en",
    timezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12h",
    currency: "INR",
};
exports.NOTIF_DEFAULTS = {
    channels: { email: true, push: true, inApp: true },
    events: { roleChanges: true, projectUpdates: true, systemAlerts: true, productNews: false },
    quietHours: { enabled: false, start: "22:00", end: "07:00" },
};
const bool = (def) => ({ type: Boolean, default: def });
// ─────────────────────────────────────────────────────────────────────────────
// 1. UserSettings: one document per user (created on first read)
//    preferences.* have NO default on purpose: "unset" means "inherit from
//    platform default". Notifications are always concrete.
// ─────────────────────────────────────────────────────────────────────────────
const userSettingsSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    avatar: { type: String, default: "" },
    preferences: {
        theme: { type: String, enum: [...exports.THEMES] },
        accentColor: { type: String, trim: true, lowercase: true },
        language: { type: String, trim: true },
        timezone: { type: String, trim: true },
        dateFormat: { type: String, enum: [...exports.DATE_FORMATS] },
        timeFormat: { type: String, enum: [...exports.TIME_FORMATS] },
    },
    notifications: {
        channels: {
            email: bool(exports.NOTIF_DEFAULTS.channels.email),
            push: bool(exports.NOTIF_DEFAULTS.channels.push),
            inApp: bool(exports.NOTIF_DEFAULTS.channels.inApp),
        },
        events: {
            roleChanges: bool(exports.NOTIF_DEFAULTS.events.roleChanges),
            projectUpdates: bool(exports.NOTIF_DEFAULTS.events.projectUpdates),
            systemAlerts: bool(exports.NOTIF_DEFAULTS.events.systemAlerts),
            productNews: bool(exports.NOTIF_DEFAULTS.events.productNews),
        },
        quietHours: {
            enabled: bool(exports.NOTIF_DEFAULTS.quietHours.enabled),
            start: { type: String, default: exports.NOTIF_DEFAULTS.quietHours.start },
            end: { type: String, default: exports.NOTIF_DEFAULTS.quietHours.end },
        },
    },
}, { timestamps: true, collection: "user_settings" });
exports.UserSettings = mongoose_1.default.model("UserSettings", userSettingsSchema);
// ─────────────────────────────────────────────────────────────────────────────
// 2. PlatformSettings: a single document (key = "global")
// ─────────────────────────────────────────────────────────────────────────────
const platformSettingsSchema = new mongoose_1.Schema({
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
        theme: { type: String, enum: [...exports.THEMES], default: exports.HARD_DEFAULTS.theme },
        accentColor: { type: String, lowercase: true, default: exports.HARD_DEFAULTS.accentColor },
        language: { type: String, default: exports.HARD_DEFAULTS.language },
        timezone: { type: String, default: exports.HARD_DEFAULTS.timezone },
        dateFormat: { type: String, enum: [...exports.DATE_FORMATS], default: exports.HARD_DEFAULTS.dateFormat },
        timeFormat: { type: String, enum: [...exports.TIME_FORMATS], default: exports.HARD_DEFAULTS.timeFormat },
        currency: { type: String, default: exports.HARD_DEFAULTS.currency },
    },
    maintenance: {
        enabled: { type: Boolean, default: false },
        message: { type: String, default: "" },
    },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true, collection: "platform_settings" });
exports.PlatformSettings = mongoose_1.default.model("PlatformSettings", platformSettingsSchema);
//# sourceMappingURL=setting.js.map