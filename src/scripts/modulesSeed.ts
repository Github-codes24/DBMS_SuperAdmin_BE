import dotenv from "dotenv";
// import mongoose from "mongoose";

dotenv.config();
import mongoose, { Types } from "mongoose";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);   // use the same env var your app uses
  const db = mongoose.connection.db!;                // this defines `db`, so the error goes away
  const now = new Date();

  // ---------- Safety check: duplicate role names inside one project ----------
  const dupes = await db.collection("roles").aggregate([
    { $group: { _id: { p: "$projectId", n: { $toLower: "$name" } }, c: { $sum: 1 } } },
    { $match: { c: { $gt: 1 } } },
  ]).toArray();
  if (dupes.length) {
    console.error("Duplicate role names found. Rename them first:", JSON.stringify(dupes));
    process.exit(1);
  }

  // ---------- 1. Drop old Permission indexes ----------
  for (const name of ["name_1", "key_1"]) {
    await db.collection("permissions").dropIndex(name).catch(() => console.log(`index ${name} not found, skipping`));
  }
  const oldPerms = await db.collection("permissions").deleteMany({ projectId: { $exists: false } });
  console.log("old global permission docs removed:", oldPerms.deletedCount);

  // ---------- 2. Users ----------
  await db.collection("users").updateMany({}, { $unset: { projectIds: "" } });
  await db.collection("users").updateMany({ tokenVersion: { $exists: false } }, { $set: { tokenVersion: 0 } });
  const demoted = await db.collection("users").updateMany(
    { role: { $in: ["admin", "manager"] } },
    { $set: { role: "user" } },
  );
  console.log("users moved from admin/manager to user:", demoted.modifiedCount);

  // ---------- 3. projectRoles.projectId string -> ObjectId ----------
  const cursor = db.collection("users").find({ "projectRoles.projectId": { $type: "string" } });
  for await (const u of cursor) {
    const fixed = [];
    for (const pr of u.projectRoles as any[]) {
      if (typeof pr.projectId !== "string") { fixed.push(pr); continue; }
      const p = /^[0-9a-fA-F]{24}$/.test(pr.projectId)
        ? await db.collection("projects").findOne({ _id: new Types.ObjectId(pr.projectId) })
        : await db.collection("projects").findOne({ projectId: pr.projectId });
      if (!p) { console.log("NO MATCH:", u.email, pr.projectId); fixed.push(pr); continue; }
      fixed.push({ ...pr, projectId: p._id, isActive: pr.isActive ?? true });
    }
    await db.collection("users").updateOne({ _id: u._id }, { $set: { projectRoles: fixed } });
  }

  // ---------- 3b. New fields on existing projects and roles ----------
  await db.collection("projects").updateMany({ type: { $exists: false } }, { $set: { type: "tenant" } });
  await db.collection("roles").updateMany(
    { version: { $exists: false } },
    { $set: { version: 1, isSystem: false, moduleKeys: [] } },
  );

  // ---------- 4. Seed: actions, PLATFORM project, modules, permissions, SuperAdmin role ----------
  const sa = await db.collection("users").findOne({ role: "superadmin" });
  if (!sa) throw new Error("No superadmin user found");

  const ACTIONS = [
    { key: "view",   label: "View Access",   sortOrder: 1 },
    { key: "edit",   label: "Edit / Update", sortOrder: 2 },
    { key: "import", label: "Import Data",   sortOrder: 3 },
    { key: "delete", label: "Delete Access", sortOrder: 4 },
  ];
  for (const a of ACTIONS) {
    await db.collection("actions").updateOne(
      { key: a.key },
      { $setOnInsert: { ...a, isActive: true, createdAt: now, updatedAt: now } },
      { upsert: true },
    );
  }
  const actions = await db.collection("actions").find({ isActive: true }).toArray();

  await db.collection("projects").updateOne(
    { projectId: "PLATFORM" },
    { $setOnInsert: {
        name: "Platform", description: "DBMS SuperAdmin platform",
        status: "active", type: "platform", createdBy: sa._id, createdAt: now, updatedAt: now } },
    { upsert: true },
  );
  const platform = await db.collection("projects").findOne({ projectId: "PLATFORM" });
  if (!platform) throw new Error("Platform project missing");

  const modules = [
    { key: "dashboard",         name: "Dashboard",           description: "View the platform overview and key activity." },
    { key: "user-management",   name: "User Management",     description: "Manage user accounts and information." },
    { key: "roles-permissions", name: "Roles & Permissions", description: "Manage role access and permissions." },
    { key: "reports",           name: "Reports",             description: "View and generate platform reports." },
  ];

  for (const [i, m] of modules.entries()) {
    await db.collection("modules").updateOne(
      { projectId: platform._id, key: m.key },
      { $setOnInsert: { ...m, sortOrder: i, isActive: true, createdAt: now, updatedAt: now } },
      { upsert: true },
    );
    for (const a of actions) {
      await db.collection("permissions").updateOne(
        { projectId: platform._id, key: `${m.key}:${a.key}` },
        { $setOnInsert: {
            moduleKey: m.key, actionKey: a.key, name: `${m.name}: ${a.label}`,
            description: "", isActive: true, createdAt: now, updatedAt: now } },
        { upsert: true },
      );
    }
  }

  await db.collection("roles").updateOne(
    { projectId: platform._id, name: "SuperAdmin" },
    { $setOnInsert: {
        description: "Platform super administrator",
        moduleKeys: modules.map((m) => m.key),
        permissions: [], isActive: true, isSystem: true, version: 1,
        createdBy: sa._id, createdAt: now, updatedAt: now } },
    { upsert: true },
  );

  const count = await db.collection("permissions").countDocuments({ projectId: platform._id });
  console.log(`Seed complete. Platform permission docs: ${count} (expect 16)`);

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });