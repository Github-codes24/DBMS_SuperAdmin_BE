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
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const authorize_1 = require("../middleware/authorize");
const validate_1 = require("../middleware/validate");
// ───────────────────────────────────────────────────────────────────────────────
const v = __importStar(require("../validators/setting"));
const ctl = __importStar(require("../controllers/setting.Controller"));
const router = (0, express_1.Router)();
const superadmin = (0, authorize_1.authorize)("superadmin");
// ── PUBLIC (no token): login screen branding and maintenance flag ─────────────
router.get("/public", ctl.getPublic);
// everything below needs a valid token
router.use(authenticate_1.authenticate);
// ── MY SETTINGS (any logged-in user) ──────────────────────────────────────────
router.get("/me", (0, validate_1.validate)(v.getMeDto), ctl.getMe);
router.patch("/me/profile", (0, validate_1.validate)(v.updateProfileDto), ctl.updateProfile);
router.patch("/me/preferences", (0, validate_1.validate)(v.updateMyPreferencesDto), ctl.updateMyPreferences);
router.patch("/me/notifications", (0, validate_1.validate)(v.updateMyNotificationsDto), ctl.updateMyNotifications);
router.put("/me/password", (0, validate_1.validate)(v.changePasswordDto), ctl.changePassword);
router.post("/me/logout-all", (0, validate_1.validate)(v.logoutAllDto), ctl.logoutAll);
// ── PLATFORM SETTINGS (superadmin) ────────────────────────────────────────────
router.get("/platform", superadmin, (0, validate_1.validate)(v.getPlatformDto), ctl.getPlatform);
router.patch("/platform/general", superadmin, (0, validate_1.validate)(v.updatePlatformGeneralDto), ctl.updatePlatformGeneral);
router.patch("/platform/security", superadmin, (0, validate_1.validate)(v.updatePlatformSecurityDto), ctl.updatePlatformSecurity);
router.patch("/platform/defaults", superadmin, (0, validate_1.validate)(v.updatePlatformDefaultsDto), ctl.updatePlatformDefaults);
router.patch("/platform/maintenance", superadmin, (0, validate_1.validate)(v.updatePlatformMaintenanceDto), ctl.updatePlatformMaintenance);
exports.default = router;
//# sourceMappingURL=settingRoutes.js.map