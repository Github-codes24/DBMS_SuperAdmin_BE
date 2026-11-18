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
exports.updatePlatformMaintenance = exports.updatePlatformDefaults = exports.updatePlatformSecurity = exports.updatePlatformGeneral = exports.getPlatform = exports.logoutAll = exports.changePassword = exports.updateMyNotifications = exports.updateMyPreferences = exports.updateProfile = exports.getMe = exports.getPublic = void 0;
const svc = __importStar(require("../services/setting.service"));
const helpers_js_1 = require("./helpers.js");
// Small local helpers so this file has no dependency on your utils.
// If you prefer, replace wrap/ok with the ones your other controllers use.
// const wrap =
//   (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
//   (req, res, next) => {
//     fn(req, res).catch(next);
//   };
// const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });
/** The user id always comes from the token, never from the URL or body. */
const me = (req) => String(req.user._id);
// public
exports.getPublic = (0, helpers_js_1.wrap)(async (_req, res) => (0, helpers_js_1.ok)(res, await svc.getPublic()));
// my settings
exports.getMe = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.getMe(me(req))));
exports.updateProfile = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.updateProfile(me(req), req.body)));
exports.updateMyPreferences = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.updateMyPreferences(me(req), req.body)));
exports.updateMyNotifications = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.updateMyNotifications(me(req), req.body)));
exports.changePassword = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.changePassword(me(req), req.body.currentPassword, req.body.newPassword)));
exports.logoutAll = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.logoutAllDevices(me(req))));
// platform
exports.getPlatform = (0, helpers_js_1.wrap)(async (_req, res) => (0, helpers_js_1.ok)(res, await svc.getPlatform()));
exports.updatePlatformGeneral = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.updatePlatformSection("general", req.body, me(req))));
exports.updatePlatformSecurity = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.updatePlatformSection("security", req.body, me(req))));
exports.updatePlatformDefaults = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.updatePlatformSection("defaults", req.body, me(req))));
exports.updatePlatformMaintenance = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.updatePlatformSection("maintenance", req.body, me(req))));
//# sourceMappingURL=setting.Controller.js.map