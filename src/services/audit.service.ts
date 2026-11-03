// services/audit.service.ts
import { Types } from "mongoose";
import { AuditLog } from "../models/auditLog";

type Id = string | Types.ObjectId;

export async function audit(
  event: string,
  d: { actorId: Id; projectId?: Id; targetId?: Id; before?: unknown; after?: unknown },
) {
  try {
    await AuditLog.create({ event, ...d });
  } catch (e) {
    console.error("audit failed", e);          // a logging failure must never break the request
  }
}