"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = __importDefault(require("mongoose"));
const User_js_1 = require("../models/User.js");
const password_js_1 = require("../utils/password.js");
const FAKE_USERS = [
    {
        name: "Sarah Connor",
        email: "sarah.admin@enterprise.io",
        password: "AdminSecure2026!#",
        role: "user",
        isActive: true,
    },
    {
        name: "David Miller",
        email: "david.manager@cloudcorp.com",
        password: "ManagerPass987$!",
        role: "user",
        isActive: true,
    },
    {
        name: "Emily Watson",
        email: "emily.dev@technocrate.io",
        password: "DevUserSecret#2026",
        role: "user",
        isActive: true,
    },
    {
        name: "Robert Vance",
        email: "robert.vance@auditors.org",
        password: "AuditorPassword!2026",
        role: "user",
        isActive: false, // inactive for status testing
    },
    {
        name: "Elena Rostova",
        email: "elena.rostova@analytics.ai",
        password: "ElenaPassword@2026",
        role: "user",
        isActive: true,
    },
    {
        name: "Marcus Aurelius",
        email: "marcus.dev@technocrate.io",
        password: "MarcusPassword!2026",
        role: "user",
        isActive: true,
    },
    {
        name: "Chloe Decker",
        email: "chloe.admin@lapd-ops.gov",
        password: "ChloeAdminPass2026!",
        role: "user",
        isActive: true,
    },
    {
        name: "Zack Martin",
        email: "zack.martin@testmail.com",
        password: "ZackTestPass#2026",
        role: "user",
        isActive: false,
    },
];
async function seedFakeUsers() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error("MONGODB_URI is not configured in .env");
    }
    console.log("Connecting to MongoDB...");
    await mongoose_1.default.connect(mongoUri);
    console.log("MongoDB connected.");
    console.log("Seeding fake users for API testing...");
    let createdCount = 0;
    let skippedCount = 0;
    for (const item of FAKE_USERS) {
        const existing = await User_js_1.User.findOne({ email: item.email.toLowerCase() });
        if (existing) {
            console.log(`- Skipping ${item.email} (already exists)`);
            skippedCount++;
            continue;
        }
        const passwordHash = await (0, password_js_1.hashPassword)(item.password);
        const user = await User_js_1.User.create({
            name: item.name,
            email: item.email.toLowerCase(),
            passwordHash,
            role: item.role,
            isActive: item.isActive,
        });
        console.log(`+ Created: [${user.role.toUpperCase()}] ${user.name} (${user.email}) -> ID: ${user._id}`);
        createdCount++;
    }
    console.log("");
    console.log("==========================================");
    console.log(`Seeding complete: ${createdCount} created, ${skippedCount} skipped`);
    console.log("==========================================");
}
seedFakeUsers()
    .catch((err) => {
    console.error("Seeding failed:", err);
    process.exitCode = 1;
})
    .finally(async () => {
    await mongoose_1.default.disconnect();
});
//# sourceMappingURL=seedFakeUsers.js.map