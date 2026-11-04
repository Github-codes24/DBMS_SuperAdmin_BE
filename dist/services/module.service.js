"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listModules = listModules;
exports.createModules = createModules;
exports.updateModule = updateModule;
exports.setModuleActions = setModuleActions;
exports.listActions = listActions;
exports.createAction = createAction;
exports.updateAction = updateAction;
const mongoose_1 = __importDefault(require("mongoose"));
const modules_1 = require("../models/modules");
const action_1 = require("../models/action");
const permission_js_1 = require("../models/permission.js");
const roles_js_1 = require("../models/roles.js");
const Project_js_1 = require("../models/Project.js");
const httpError_js_1 = require("../utils/httpError.js");
const audit_service_js_1 = require("./audit.service.js");
async function assertProject(projectId) {
    if (!(await Project_js_1.Project.exists({ _id: projectId })))
        throw (0, httpError_js_1.httpError)(404, "PROJECT_NOT_FOUND", "Project not found");
}
/** Remove permission keys from every role in the project and bump versions (instant revocation). */
async function revokeKeys(projectId, keys) {
    if (keys.length === 0)
        return;
    await roles_js_1.Role.updateMany({ projectId, permissions: { $in: keys } }, { $pull: { permissions: { $in: keys } }, $inc: { version: 1 } });
}
async function listModules(projectId) {
    await assertProject(projectId);
    const [modules, perms] = await Promise.all([
        modules_1.Module.find({ projectId }).sort({ sortOrder: 1 }).lean(),
        permission_js_1.Permission.find({ projectId, isActive: true }).select("moduleKey actionKey").lean(),
    ]);
    return modules.map((m) => ({ ...m, allowedActions: perms.filter((p) => p.moduleKey === m.key).map((p) => p.actionKey) }));
}
/** One module or many: POST .../modules/bulk. Each module gets its Permission docs in one transaction. */
async function createModules(projectId, items, actorId) {
    await assertProject(projectId);
    if (new Set(items.map((i) => i.key)).size !== items.length)
        throw (0, httpError_js_1.httpError)(400, "DUPLICATE_KEYS", "Duplicate module keys in request");
    const catalog = await action_1.Action.find({ isActive: true }).sort({ sortOrder: 1 });
    const byKey = new Map(catalog.map((a) => [a.key, a]));
    const session = await mongoose_1.default.startSession(); // needs a replica set (Atlas has one)
    try {
        await session.withTransaction(async () => {
            const base = await modules_1.Module.countDocuments({ projectId }).session(session);
            for (const [i, m] of items.entries()) {
                const acts = (m.actions ?? catalog.map((a) => a.key)).map((k) => {
                    const a = byKey.get(k);
                    if (!a)
                        throw (0, httpError_js_1.httpError)(400, "INVALID_ACTION", `Unknown action: ${k}`);
                    return a;
                });
                await modules_1.Module.create([{ projectId, key: m.key, name: m.name.trim(), description: m.description?.trim() ?? "", sortOrder: base + i }], { session });
                await permission_js_1.Permission.insertMany(acts.map((a) => ({ projectId, moduleKey: m.key, actionKey: a.key, key: `${m.key}:${a.key}`, name: `${m.name.trim()}: ${a.label}` })), { session });
            }
        });
    }
    catch (e) {
        if ((0, httpError_js_1.isDuplicateKey)(e))
            throw (0, httpError_js_1.httpError)(409, "MODULE_EXISTS", "A module with this key already exists in this project");
        throw e;
    }
    finally {
        await session.endSession();
    }
    await (0, audit_service_js_1.audit)("module.created", { actorId, projectId, after: items.map((i) => i.key) });
    return listModules(projectId);
}
async function updateModule(projectId, moduleId, data, actorId) {
    const mod = await modules_1.Module.findOne({ _id: moduleId, projectId });
    if (!mod)
        throw (0, httpError_js_1.httpError)(404, "MODULE_NOT_FOUND", "Module not found");
    if (data.name !== undefined)
        mod.name = data.name.trim(); // key is immutable on purpose
    if (data.description !== undefined)
        mod.description = data.description.trim();
    if (data.sortOrder !== undefined)
        mod.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) {
        if (data.isActive === false && mod.isActive) {
            const perms = await permission_js_1.Permission.find({ projectId, moduleKey: mod.key }).select("key").lean();
            await revokeKeys(projectId, perms.map((p) => p.key)); // disabling a module takes the access away
        }
        mod.isActive = data.isActive;
    }
    await mod.save();
    await (0, audit_service_js_1.audit)("module.updated", { actorId, projectId, targetId: moduleId, after: data });
    return mod;
}
/** Choose which actions a module supports, e.g. Reports: view only. */
async function setModuleActions(projectId, moduleId, actionKeys, actorId) {
    const mod = await modules_1.Module.findOne({ _id: moduleId, projectId });
    if (!mod)
        throw (0, httpError_js_1.httpError)(404, "MODULE_NOT_FOUND", "Module not found");
    const catalog = await action_1.Action.find({ isActive: true, key: { $in: actionKeys } });
    if (catalog.length !== new Set(actionKeys).size)
        throw (0, httpError_js_1.httpError)(400, "INVALID_ACTION", "Unknown action in list");
    const existing = await permission_js_1.Permission.find({ projectId, moduleKey: mod.key });
    const have = new Set(existing.map((p) => p.actionKey));
    const want = new Set(actionKeys);
    const toAdd = catalog.filter((a) => !have.has(a.key));
    const toRemove = existing.filter((p) => !want.has(p.actionKey));
    if (toAdd.length) {
        await permission_js_1.Permission.insertMany(toAdd.map((a) => ({
            projectId, moduleKey: mod.key, actionKey: a.key, key: `${mod.key}:${a.key}`, name: `${mod.name}: ${a.label}`,
        })));
    }
    if (toRemove.length) {
        const keys = toRemove.map((p) => p.key);
        await permission_js_1.Permission.deleteMany({ projectId, key: { $in: keys } });
        await revokeKeys(projectId, keys);
    }
    await (0, audit_service_js_1.audit)("module.actions.updated", { actorId, projectId, targetId: moduleId, before: [...have], after: actionKeys });
    return listModules(projectId);
}
/* ------------------------------ actions ------------------------------ */
async function listActions() {
    return action_1.Action.find().sort({ sortOrder: 1 }).lean();
}
/**
 * New action (e.g. export). By default it only enters the catalog; attach it to modules with setModuleActions.
 * applyToAllModules = true adds it to every module of every project.
 */
async function createAction(input, actorId) {
    try {
        const action = await action_1.Action.create({ key: input.key, label: input.label.trim(), sortOrder: input.sortOrder ?? 0 });
        if (input.applyToAllModules) {
            const modules = await modules_1.Module.find({ isActive: true }).lean();
            if (modules.length) {
                await permission_js_1.Permission.bulkWrite(modules.map((m) => ({
                    updateOne: {
                        filter: { projectId: m.projectId, key: `${m.key}:${action.key}` },
                        update: { $setOnInsert: { moduleKey: m.key, actionKey: action.key, name: `${m.name}: ${action.label}`, isActive: true } },
                        upsert: true,
                    },
                })));
            }
        }
        await (0, audit_service_js_1.audit)("action.created", { actorId, after: input });
        return action;
    }
    catch (e) {
        if ((0, httpError_js_1.isDuplicateKey)(e))
            throw (0, httpError_js_1.httpError)(409, "ACTION_EXISTS", "Action key already exists");
        throw e;
    }
}
async function updateAction(key, data, actorId) {
    const action = await action_1.Action.findOneAndUpdate({ key }, { $set: data }, { new: true });
    if (!action)
        throw (0, httpError_js_1.httpError)(404, "ACTION_NOT_FOUND", "Action not found");
    await (0, audit_service_js_1.audit)("action.updated", { actorId, after: data });
    return action;
}
//# sourceMappingURL=module.service.js.map