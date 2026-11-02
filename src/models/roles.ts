
import mongoose, { Schema, type InferSchemaType } from "mongoose";

// const roleSchema = new Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     description: {
//       type: String,
//       trim: true,
//       default: "",
//     },
//     projectId: {
//       type: Schema.Types.ObjectId,
//       ref: "Project",
//       required: true,
//       index: true,
//     },
//     permissions: {
//       type: [String],
//       default: [],
//     },
//     isActive: {
//       type: Boolean,
//       default: true,
//     },
//     createdBy: {
//       type: Schema.Types.ObjectId,
//       ref: "User",
//     },
//   },
//   {
//     timestamps: true,
//     collection: "roles",
//   },
// );

// // Compound unique index: same role name allowed in different projects
// roleSchema.index({ projectId: 1, name: 1 }, { unique: true });


const roleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    moduleKeys: { type: [String], default: [] },
    permissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    version: { type: Number, default: 1 },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "roles" },
);
roleSchema.index(
  { projectId: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);
roleSchema.index({ projectId: 1, permissions: 1 });



export const Role = mongoose.model("Role", roleSchema);