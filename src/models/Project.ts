import mongoose, { Schema } from "mongoose";

const panelLinkSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const userTypeSchema = new Schema(
  {
    role: { type: String, required: true, trim: true },
    count: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const projectSchema = new Schema(
  {
    projectId: { type: String, required: true, unique: true, trim: true },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: { type: String, trim: true, default: "" },
    logo: { type: String, trim: true, default: "" },
    theme: { type: String, trim: true, default: "#f96321" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "inactive", "upcoming", "completed", "on_hold"],
      default: "active",
      required: true,
    },
    type: { type: String, enum: ["platform", "tenant"], default: "tenant" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: false, default: null },
    panelLinks: { type: [panelLinkSchema], default: [] },
    userTypes: { type: [userTypeSchema], default: [] },
  },
  { timestamps: true, collection: "projects" },
);

export const Project = mongoose.model("Project", projectSchema);
