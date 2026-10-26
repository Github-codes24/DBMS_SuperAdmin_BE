"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = __importDefault(require("mongoose"));
const app_js_1 = __importDefault(require("./app.js"));
const PORT = Number(process.env.PORT) || 3007;
const MONGODB_URI = process.env.MONGODB_URI;
async function startServer() {
    if (!MONGODB_URI) {
        throw new Error("MONGODB_URI is not configured in .env");
    }
    await mongoose_1.default.connect(MONGODB_URI);
    console.log("MongoDB connected successfully");
    const server = app_js_1.default.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
    const shutdown = async () => {
        console.log("Shutting down server...");
        server.close(async () => {
            await mongoose_1.default.disconnect();
            process.exit(0);
        });
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}
startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});
//# sourceMappingURL=server.js.map