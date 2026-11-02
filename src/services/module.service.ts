import mongoose from "mongoose";
import { Module } from "../models/modules";
import { Action } from "../models/action";
import { Permission } from "../models/permission.js";
import { Role } from "../models/roles.js";
import { Project } from "../models/Project.js";
import { httpError, isDuplicateKey } from "../utils/httpError.js";
import { audit } from "./audit.service.js";

interface ModuleInput { key: string; name: string; description?: string; actions?: string[] }

async function assertProject(projectId: string) {
  if (!(await Project.exists({ _id: projectId }))) throw httpError(404, "PROJECT_NOT_FOUND", "Project not found");
}

/** Remove permission keys from every role in the project and bump versions (instant revocation). */
async function revokeKeys(projectId: string, keys: string[]) {
  if (keys.length === 0) return;
  await Role.updateMany(
    { projectId, permissions: { $in: keys } },
    { $pull: { permissions: { $in: keys } }, $inc: { version: 1 } },
  );
}

export async function listModules(projectId: string) {
  await assertProject(projectId);
  const [modules, perms] = await Promise.all([
    Module.find({ projectId }).sort({ sortOrder: 1 }).lean(),
    Permission.find({ projectId, isActive: true }).select("moduleKey actionKey").lean(),
  ]);
  return modules.map((m) => ({ ...m, allowedActions: perms.filter((p) => p.moduleKey === m.key).map((p) => p.actionKey) }));
}

/** One module or many: POST .../modules/bulk. Each module gets its Permission docs in one transaction. */
export async function createModules(projectId: string, items: ModuleInput[], actorId: string) {
  await assertProject(projectId);
  if (new Set(items.map((i) => i.key)).size !== items.length) throw httpError(400, "DUPLICATE_KEYS", "Duplicate module keys in request");

  const catalog = await Action.find({ isActive: true }).sort({ sortOrder: 1 });
  const byKey = new Map(catalog.map((a) => [a.key, a]));
  const session = await mongoose.startSession();       // needs a replica set (Atlas has one)

  try {
    await session.withTransaction(async () => {
      const base = await Module.countDocuments({ projectId }).session(session);
      for (const [i, m] of items.entries()) {
        const acts = (m.actions ?? catalog.map((a) => a.key)).map((k) => {
          const a = byKey.get(k);
          if (!a) throw httpError(400, "INVALID_ACTION", `Unknown action: ${k}`);
          return a;
        });
        await Module.create([{ projectId, key: m.key, name: m.name.trim(), description: m.description?.trim() ?? "", sortOrder: base + i }], { session });
        await Permission.insertMany(
          acts.map((a) => ({ projectId, moduleKey: m.key, actionKey: a.key, key: `${m.key}:${a.key}`, name: `${m.name.trim()}: ${a.label}` })),
          { session },
        );
      }
    });
  } catch (e) {
    if (isDuplicateKey(e)) throw httpError(409, "MODULE_EXISTS", "A module with this key already exists in this project");
    throw e;
  } finally {
    await session.endSession();
  }

  await audit("module.created", { actorId, projectId, after: items.map((i) => i.key) });
  return listModules(projectId);
}

export async function updateModule(
  projectId: string,
  moduleId: string,
  data: { name?: string; description?: string; sortOrder?: number; isActive?: boolean },
  actorId: string,
) {
  const mod = await Module.findOne({ _id: moduleId, projectId });
  if (!mod) throw httpError(404, "MODULE_NOT_FOUND", "Module not found");

  if (data.name !== undefined) mod.name = data.name.trim();                       // key is immutable on purpose
  if (data.description !== undefined) mod.description = data.description.trim();
  if (data.sortOrder !== undefined) mod.sortOrder = data.sortOrder;
  if (data.isActive !== undefined) {
    if (data.isActive === false && mod.isActive) {
      const perms = await Permission.find({ projectId, moduleKey: mod.key }).select("key").lean();
      await revokeKeys(projectId, perms.map((p) => p.key));                       // disabling a module takes the access away
    }
    mod.isActive = data.isActive;
  }
  await mod.save();
  await audit("module.updated", { actorId, projectId, targetId: moduleId, after: data });
  return mod;
}

/** Choose which actions a module supports, e.g. Reports: view only. */
export async function setModuleActions(projectId: string, moduleId: string, actionKeys: string[], actorId: string) {
  const mod = await Module.findOne({ _id: moduleId, projectId });
  if (!mod) throw httpError(404, "MODULE_NOT_FOUND", "Module not found");

  const catalog = await Action.find({ isActive: true, key: { $in: actionKeys } });
  if (catalog.length !== new Set(actionKeys).size) throw httpError(400, "INVALID_ACTION", "Unknown action in list");

  const existing = await Permission.find({ projectId, moduleKey: mod.key });
  const have = new Set(existing.map((p) => p.actionKey));
  const want = new Set(actionKeys);

  const toAdd = catalog.filter((a) => !have.has(a.key));
  const toRemove = existing.filter((p) => !want.has(p.actionKey));

  if (toAdd.length) {
    await Permission.insertMany(toAdd.map((a) => ({
      projectId, moduleKey: mod.key, actionKey: a.key, key: `${mod.key}:${a.key}`, name: `${mod.name}: ${a.label}`,
    })));
  }
  if (toRemove.length) {
    const keys = toRemove.map((p) => p.key);
    await Permission.deleteMany({ projectId, key: { $in: keys } });
    await revokeKeys(projectId, keys);
  }
  await audit("module.actions.updated", { actorId, projectId, targetId: moduleId, before: [...have], after: actionKeys });
  return listModules(projectId);
}

/* ------------------------------ actions ------------------------------ */

export async function listActions() {
  return Action.find().sort({ sortOrder: 1 }).lean();
}

/**
 * New action (e.g. export). By default it only enters the catalog; attach it to modules with setModuleActions.
 * applyToAllModules = true adds it to every module of every project.
 */
export async function createAction(
  input: { key: string; label: string; sortOrder?: number; applyToAllModules?: boolean },
  actorId: string,
) {
  try {
    const action = await Action.create({ key: input.key, label: input.label.trim(), sortOrder: input.sortOrder ?? 0 });
    if (input.applyToAllModules) {
      const modules = await Module.find({ isActive: true }).lean();
      if (modules.length) {
        await Permission.bulkWrite(modules.map((m) => ({
          updateOne: {
            filter: { projectId: m.projectId, key: `${m.key}:${action.key}` },
            update: { $setOnInsert: { moduleKey: m.key, actionKey: action.key, name: `${m.name}: ${action.label}`, isActive: true } },
            upsert: true,
          },
        })));
      }
    }
    await audit("action.created", { actorId, after: input });
    return action;
  } catch (e) {
    if (isDuplicateKey(e)) throw httpError(409, "ACTION_EXISTS", "Action key already exists");
    throw e;
  }
}

export async function updateAction(key: string, data: { label?: string; sortOrder?: number; isActive?: boolean }, actorId: string) {
  const action = await Action.findOneAndUpdate({ key }, { $set: data }, { new: true });
  if (!action) throw httpError(404, "ACTION_NOT_FOUND", "Action not found");
  await audit("action.updated", { actorId, after: data });
  return action;
}