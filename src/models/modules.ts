
import mongoose, { Schema, type InferSchemaType } from "mongoose";

// 

//     {
//       projectId: { 
//         type: Schema.Types.ObjectId,
//         ref: "Project",
//          required: true 
//         },
//       key: { 
//         type: String,
//          required: true,
//           lowercase: true,
//            trim: true 
//         },
//       name: {
//          type: String,
//           required: true,
//            trim: true
//          },
//       description: {
//          type: String,
//           trim: true,
//            default: ""
//          },
//       sortOrder: {
//          type: Number,
//           default: 0 
//         },
//       isActive: {
//          type: Boolean, 
//          default: true
//          },
//     },
//     { timestamps: true, collection: "modules" },
//   );
//   moduleSchema.index({ projectId: 1, key: 1 }, { unique: true });

const moduleSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    projectName: { type: String, required: true, trim: true },
    panel: { type: String, required: true, lowercase: true, trim: true },
    key: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "modules" }
);

// key is unique per project AND panel
moduleSchema.index({ projectId: 1, panel: 1, key: 1 }, { unique: true });
  export const Module = mongoose.model("Module", moduleSchema);