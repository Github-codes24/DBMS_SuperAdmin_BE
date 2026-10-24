"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const requestContext_js_1 = require("./middleware/requestContext.js");
const notFound_js_1 = require("./middleware/notFound.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const apiManager_js_1 = require("./utils/apiManager.js");
const authRoutes_js_1 = __importDefault(require("./routes/authRoutes.js"));
const app = (0, express_1.default)();
app.disable("x-powered-by");
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    exposedHeaders: ["X-Request-ID"],
}));
app.use(requestContext_js_1.requestContext);
app.use(express_1.default.json({ limit: "1mb" }));
app.get("/api/health", (_req, res) => {
    return apiManager_js_1.apiManager.success(res, "DBMS Super Admin API is running", {
        service: "dbms-superadmin-api",
        timestamp: new Date().toISOString(),
    });
});
app.use("/api/auth", authRoutes_js_1.default);
// Register feature routes above these two handlers.
app.use(notFound_js_1.notFound);
app.use(errorHandler_js_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map