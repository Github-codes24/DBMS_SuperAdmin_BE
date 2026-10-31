import { Request } from "express";
import { httpError } from "./httpError.js";

export const actorId = (req: Request): string => String((req as any).user?._id ?? (req as any).user?.id);

/** Always returns a single string, whatever the Express typings say. */
export function param(req: Request, name: string): string {
  const v = req.params[name];
  const s = Array.isArray(v) ? v[0] : v;
  if (!s) throw httpError(400, "MISSING_PARAM", `Missing ${name}`);
  return s;
}