import mongoose, { Schema, type InferSchemaType } from "mongoose";

const auditLogSchema = new Schema(
    {
      event: { type: String, required: true, index: true },        // "role.permissions.updated", "access.denied"...
      actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      projectId: { type: Schema.Types.ObjectId, ref: "Project" },
      targetId: { type: Schema.Types.ObjectId },                   // role, user or module affected
      before: { type: Schema.Types.Mixed },
      after: { type: Schema.Types.Mixed },
      ip: String,
    },
    { timestamps: { createdAt: true, updatedAt: false }, collection: "audit_logs" },
  );
  auditLogSchema.index({ projectId: 1, createdAt: -1 });
  export const AuditLog =mongoose. model("AuditLog", auditLogSchema);
