// action module  

import mongoose, { Schema, type InferSchemaType } from "mongoose";
const actionSchema = new Schema(
    {
      key: { type: String, required: true, unique: true, lowercase: true, trim: true },
      label: { type: String, required: true, trim: true },
      sortOrder: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true, collection: "actions" },
  );
  
  export const Action = mongoose.model("Action", actionSchema);