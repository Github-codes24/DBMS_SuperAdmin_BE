
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["superadmin", "admin", "manager", "user"],
      default: "user",
      required: true,
    },
    projectIds: {
      type: [String],
      default: [],
    },
    projectRoles: [
      {
        projectId: { type: String, required: true },
        roleId: { type: Schema.Types.ObjectId, ref: "Role", required: true },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "users",
  },
);
const refreshSessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "refreshSessions",
  },
);

refreshSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);



export type RefreshSessionDocument =
  InferSchemaType<typeof refreshSessionSchema>;

export const RefreshSession = mongoose.model(
  "RefreshSession",
  refreshSessionSchema,
);
export type UserDocument = InferSchemaType<typeof userSchema>;

export const User = mongoose.model("User", userSchema);
