
// import mongoose, { Schema, type InferSchemaType } from "mongoose";

// const roleSchema = new Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//       unique: true,
//     },
//     description: {
//       type: String,
//       trim: true,
//       default: "",
//     },
//     permissions: {
//       type: [String],
//       default: [],
//     },
//   },
//   {
//     timestamps: true,
//     collection: "roles",
//   },
// );
// export type RoleDocument = InferSchemaType<typeof roleSchema>;
// export const Role = mongoose.model("Role", roleSchema);
import { Schema, model, Types } from "mongoose";

const roleSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "roles",
  },
);

// Compound unique index: same role name allowed in different projects
roleSchema.index({ projectId: 1, name: 1 }, { unique: true });

export const Role = model("Role", roleSchema);