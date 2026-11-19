"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
const _authorizePermission_1 = require("../middleware/ authorizePermission");
const [PID, EMAIL] = process.argv.slice(2);
function check(userId, role, projectId, mod, action) {
    return new Promise((resolve) => {
        const req = {
            header: (n) => (n.toLowerCase() === "x-project-id" ? projectId : undefined),
        };
        const res = {
            locals: { auth: { userId, role } },
            code: 200,
            status(c) { this.code = c; return this; },
            json(b) { resolve({ status: this.code, message: b.message }); return this; },
        };
        (0, _authorizePermission_1.authorizePermission)(mod, action)(req, res, (err) => resolve({ status: err ? 500 : 200, message: err ? String(err) : "ALLOWED" }));
    });
}
async function main() {
    await mongoose_1.default.connect(process.env.MONGODB_URI); // use your real env var name
    const user = await User_1.User.findOne({ email: EMAIL }).lean();
    if (!user)
        throw new Error("User not found");
    const id = String(user._id);
    console.log("users:view      ->", await check(id, user.role, PID, "users", "view"));
    console.log("users:edit      ->", await check(id, user.role, PID, "users", "edit"));
    console.log("users:delete    ->", await check(id, user.role, PID, "users", "delete"));
    console.log("reports:export  ->", await check(id, user.role, PID, "reports", "export"));
    console.log("no project id   ->", await check(id, user.role, undefined, "users", "view"));
    console.log("wrong project   ->", await check(id, user.role, String(new mongoose_1.default.Types.ObjectId()), "users", "view"));
    await mongoose_1.default.disconnect();
}
main();
//# sourceMappingURL=testGuard.js.map