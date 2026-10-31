
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const moduleSchema = new Schema(
    {
      projectId: { 
        type: Schema.Types.ObjectId,
        ref: "Project",
         required: true 
        },
      key: { 
        type: String,
         required: true,
          lowercase: true,
           trim: true 
        },
      name: {
         type: String,
          required: true,
           trim: true
         },
      description: {
         type: String,
          trim: true,
           default: ""
         },
      sortOrder: {
         type: Number,
          default: 0 
        },
      isActive: {
         type: Boolean, 
         default: true
         },
    },
    { timestamps: true, collection: "modules" },
  );
  moduleSchema.index({ projectId: 1, key: 1 }, { unique: true });
  export const Module = mongoose.model("Module", moduleSchema);