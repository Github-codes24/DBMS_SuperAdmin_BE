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

const frontendAppSchema = new Schema(
  {
    appKey: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    baseUrl: { type: String, required: true, trim: true },
    allowedRoles: { type: [String], default: [] },
    ssoCallbackPath: { type: String, trim: true, default: "/sso/callback" },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false },
);

const backendConfigSchema = new Schema(
  {
    baseUrl: { type: String, trim: true, default: "" },
    bridgePrefix: {
      type: String,
      trim: true,
      default: "/api/v1/platform-bridge",
    },
    authType: {
      type: String,
      enum: ["api_key", "hmac", "service_jwt"],
      default: "api_key",
    },
    secretKeyId: { type: String, trim: true, default: "" },
    timeoutMs: { type: Number, default: 5000, min: 500, max: 60000 },
    retryAttempts: { type: Number, default: 2, min: 0, max: 5 },
  },
  { _id: false },
);

const healthStatusSchema = new Schema(
  {
    isHealthy: { type: Boolean, default: false },
    latencyMs: { type: Number, default: 0 },
    lastCheckedAt: { type: Date, default: null },
    errorMessage: { type: String, default: "" },
    version: { type: String, default: "" },
  },
  { _id: false },
);

const projectSchema = new Schema(
  {
    projectId: { type: String, required: true, unique: true, trim: true },
    projectCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
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
    integrationStatus: {
      type: String,
      enum: ["unlinked", "registered", "connected", "sync_failed"],
      default: "unlinked",
      required: true,
    },
    type: { type: String, enum: ["platform", "tenant"], default: "tenant" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
    panelLinks: { type: [panelLinkSchema], default: [] },
    userTypes: { type: [userTypeSchema], default: [] },
    frontendApps: { type: [frontendAppSchema], default: [] },
    backendConfig: {
      type: backendConfigSchema,
      default: () => ({
        baseUrl: "",
        bridgePrefix: "/api/v1/platform-bridge",
        authType: "api_key",
        secretKeyId: "",
        timeoutMs: 5000,
        retryAttempts: 2,
      }),
    },
    healthStatus: {
      type: healthStatusSchema,
      default: () => ({
        isHealthy: false,
        latencyMs: 0,
        lastCheckedAt: null,
        errorMessage: "",
        version: "",
      }),
    },
    availableModules: { type: [String], default: [] },
  },
  { timestamps: true, collection: "projects" },
);

projectSchema.index({ projectCode: 1 });

export type ProjectDocument = mongoose.InferSchemaType<typeof projectSchema>;

export const Project = mongoose.model("Project", projectSchema);
