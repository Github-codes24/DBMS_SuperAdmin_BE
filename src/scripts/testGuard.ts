import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/User"
import { authorizePermission } from "../middleware/ authorizePermission";

const [PID, EMAIL] = process.argv.slice(2);

function check(userId: string, role: string, projectId: string | undefined, mod: string, action: string) {
  return new Promise((resolve) => {
    const req: any = {
      header: (n: string) => (n.toLowerCase() === "x-project-id" ? projectId : undefined),
    };
    const res: any = {
      locals: { auth: { userId, role } },
      code: 200,
      status(c: number) { this.code = c; return this; },
      json(b: any) { resolve({ status: this.code, message: b.message }); return this; },
    };
    authorizePermission(mod, action)(req, res, (err?: any) =>
      resolve({ status: err ? 500 : 200, message: err ? String(err) : "ALLOWED" }));
  });
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string); // use your real env var name
  const user = await User.findOne({ email: EMAIL }).lean();
  if (!user) throw new Error("User not found");
  const id = String(user._id);

  console.log("users:view      ->", await check(id, user.role, PID, "users", "view"));
  console.log("users:edit      ->", await check(id, user.role, PID, "users", "edit"));
  console.log("users:delete    ->", await check(id, user.role, PID, "users", "delete"));
  console.log("reports:export  ->", await check(id, user.role, PID, "reports", "export"));
  console.log("no project id   ->", await check(id, user.role, undefined, "users", "view"));
  console.log("wrong project   ->", await check(id, user.role, String(new mongoose.Types.ObjectId()), "users", "view"));

  await mongoose.disconnect();
}
main();