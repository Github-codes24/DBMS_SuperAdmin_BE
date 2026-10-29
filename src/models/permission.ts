
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const permissionSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    collection: "permissions",
  },
);

export type PermissionDocument = InferSchemaType<typeof permissionSchema>;

export const Permission = mongoose.model("Permission", permissionSchema);
