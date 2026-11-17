import { Router } from "express";

import { authenticate } from "../middleware/authenticate"
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
// ───────────────────────────────────────────────────────────────────────────────
import * as v from "../validators/setting"
import * as ctl from "../controllers/setting.Controller";

const router = Router();
const superadmin = authorize("superadmin");

// ── PUBLIC (no token): login screen branding and maintenance flag ─────────────
router.get("/public", ctl.getPublic);

// everything below needs a valid token
router.use(authenticate);

// ── MY SETTINGS (any logged-in user) ──────────────────────────────────────────
router.get("/me", validate(v.getMeDto), ctl.getMe);
router.patch("/me/profile", validate(v.updateProfileDto), ctl.updateProfile);
router.patch("/me/preferences", validate(v.updateMyPreferencesDto), ctl.updateMyPreferences);
router.patch("/me/notifications", validate(v.updateMyNotificationsDto), ctl.updateMyNotifications);
router.put("/me/password", validate(v.changePasswordDto), ctl.changePassword);
router.post("/me/logout-all", validate(v.logoutAllDto), ctl.logoutAll);

// ── PLATFORM SETTINGS (superadmin) ────────────────────────────────────────────
router.get("/platform", superadmin, validate(v.getPlatformDto), ctl.getPlatform);
router.patch("/platform/general", superadmin, validate(v.updatePlatformGeneralDto), ctl.updatePlatformGeneral);
router.patch("/platform/security", superadmin, validate(v.updatePlatformSecurityDto), ctl.updatePlatformSecurity);
router.patch("/platform/defaults", superadmin, validate(v.updatePlatformDefaultsDto), ctl.updatePlatformDefaults);
router.patch("/platform/maintenance", superadmin, validate(v.updatePlatformMaintenanceDto), ctl.updatePlatformMaintenance);

export default router;
