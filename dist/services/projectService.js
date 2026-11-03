"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProject = createProject;
exports.getProjects = getProjects;
const mongoose_1 = __importDefault(require("mongoose"));
const Project_js_1 = require("../models/Project.js");
const COUNTER_ID = new mongoose_1.default.Types.ObjectId();
const COUNTER_PROJECT_ID = "__PROJECT_COUNTER__";
async function getNextProjectId() {
    // Find the internal counter document.
    let counter = await Project_js_1.Project.collection.findOne({
        projectId: COUNTER_PROJECT_ID,
    });
    if (!counter) {
        // Find the highest existing project ID.
        const projects = await Project_js_1.Project.find({
            projectId: /^PID-\d+$/,
        })
            .select("projectId")
            .lean();
        const maxId = projects.reduce((max, project) => {
            const match = project.projectId.match(/^PID-(\d+)$/);
            return match ? Math.max(max, Number(match[1])) : max;
        }, 0);
        try {
            await Project_js_1.Project.collection.insertOne({
                _id: COUNTER_ID,
                projectId: COUNTER_PROJECT_ID,
                seq: maxId,
            });
        }
        catch (error) {
            const duplicateKey = typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === 11000;
            if (!duplicateKey) {
                throw error;
            }
        }
    }
    // Read the counter's actual ObjectId.
    counter = await Project_js_1.Project.collection.findOne({
        projectId: COUNTER_PROJECT_ID,
    });
    if (!counter) {
        throw new Error("Project ID counter not found");
    }
    // Atomically increment the counter.
    const result = await Project_js_1.Project.collection.findOneAndUpdate({ _id: counter._id }, { $inc: { seq: 1 } }, { returnDocument: "after" });
    // Compatible with MongoDB driver versions returning ModifyResult.
    const updatedCounter = result && "value" in result ? result.value : result;
    if (!updatedCounter ||
        typeof updatedCounter.seq !== "number") {
        throw new Error("Could not generate project ID");
    }
    return `PID-${String(updatedCounter.seq).padStart(3, "0")}`;
}
async function createProject(input) {
    const projectId = await getNextProjectId();
    return Project_js_1.Project.create({
        projectId,
        name: input.name.trim(),
        description: input.description?.trim() ?? "",
        createdBy: input.createdBy,
    });
}
async function getProjects() {
    return Project_js_1.Project.find({
        projectId: /^PID-\d+$/,
    })
        .sort({ createdAt: -1 })
        .lean();
}
//# sourceMappingURL=projectService.js.map