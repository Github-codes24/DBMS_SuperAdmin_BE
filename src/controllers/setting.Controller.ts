import type { Request, Response, RequestHandler } from "express";
import * as svc from "../services/setting.service"
import { ok, wrap } from "./helpers.js";

// Small local helpers so this file has no dependency on your utils.
// If you prefer, replace wrap/ok with the ones your other controllers use.
// const wrap =
//   (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
//   (req, res, next) => {
//     fn(req, res).catch(next);
//   };
// const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });

/** The user id always comes from the token, never from the URL or body. */
const me = (req: Request) => String((req as any).user._id);

// public
export const getPublic = wrap(async (_req, res) => ok(res, await svc.getPublic()));

// my settings
export const getMe = wrap(async (req, res) => ok(res, await svc.getMe(me(req))));
export const updateProfile = wrap(async (req, res) => ok(res, await svc.updateProfile(me(req), req.body)));
export const updateMyPreferences = wrap(async (req, res) => ok(res, await svc.updateMyPreferences(me(req), req.body)));
export const updateMyNotifications = wrap(async (req, res) => ok(res, await svc.updateMyNotifications(me(req), req.body)));
export const changePassword = wrap(async (req, res) =>
  ok(res, await svc.changePassword(me(req), req.body.currentPassword, req.body.newPassword)));
export const logoutAll = wrap(async (req, res) => ok(res, await svc.logoutAllDevices(me(req))));

// platform
export const getPlatform = wrap(async (_req, res) => ok(res, await svc.getPlatform()));
export const updatePlatformGeneral = wrap(async (req, res) => ok(res, await svc.updatePlatformSection("general", req.body, me(req))));
export const updatePlatformSecurity = wrap(async (req, res) => ok(res, await svc.updatePlatformSection("security", req.body, me(req))));
export const updatePlatformDefaults = wrap(async (req, res) => ok(res, await svc.updatePlatformSection("defaults", req.body, me(req))));
export const updatePlatformMaintenance = wrap(async (req, res) => ok(res, await svc.updatePlatformSection("maintenance", req.body, me(req))));