"use strict";
// import mongoose, { Schema, type InferSchemaType } from "mongoose";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Role = void 0;
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
const mongoose_1 = require("mongoose");
const roleSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
}, {
    timestamps: true,
    collection: "roles",
});
// Compound unique index: same role name allowed in different projects
roleSchema.index({ projectId: 1, name: 1 }, { unique: true });
exports.Role = (0, mongoose_1.model)("Role", roleSchema);
//# sourceMappingURL=roles.js.map