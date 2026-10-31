
import mongoose, { Schema, type InferSchemaType } from "mongoose";

// const permissionSchema = new Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//       unique: true,
//     },
//     key: {
//       type: String,
//       required: true,
//       trim: true,
//       lowercase: true,
//       unique: true,
//     },
//     description: {
//       type: String,
//       trim: true,
//       default: "",
//     },
//   },
//   {
//     timestamps: true,
//     collection: "permissions",
//   },
// );

// export type PermissionDocument = InferSchemaType<typeof permissionSchema>;

// export const Permission = mongoose.model("Permission", permissionSchema);
const permissionSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    moduleKey: { type: String, required: true, lowercase: true, trim: true },
    actionKey: { type: String, required: true, lowercase: true, trim: true },
    key: { type: String, required: true, lowercase: true, trim: true },   // `${moduleKey}:${actionKey}`
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "permissions" },
);
permissionSchema.index({ projectId: 1, key: 1 }, { unique: true });
permissionSchema.index({ projectId: 1, moduleKey: 1 });
export const Permission = mongoose.model("Permission", permissionSchema);