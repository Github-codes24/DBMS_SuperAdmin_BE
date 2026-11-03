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
const testRoutes_js_1 = __importDefault(require("./routes/testRoutes.js"));
// import userRoutes from "./routes/userRoutes.js";
const userRoutes_js_1 = __importDefault(require("./routes/userRoutes.js"));
const rolesRoutes_js_1 = __importDefault(require("./routes/rolesRoutes.js"));
const permissionRoutes_js_1 = __importDefault(require("./routes/permissionRoutes.js"));
const projectRoutes_js_1 = __importDefault(require("./routes/projectRoutes.js"));
const app = (0, express_1.default)();
app.disable("x-powered-by");
app.use((0, helmet_1.default)());
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "https://dbms-develop.netlify.app",
    "https://dbms-live.netlify.app",
    "https://dbms-superadmin.netlify.app",
    "https://dbms-superadmin-be.onrender.com",
    // Add your production Netlify URL here.
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests without an Origin header, such as Postman.
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Project-Id"],
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
app.use("/api/test", testRoutes_js_1.default);
app.use("/api/users", userRoutes_js_1.default);
app.use("/api/roles", rolesRoutes_js_1.default);
app.use("/api/permissions", permissionRoutes_js_1.default);
app.use("/api/projects", projectRoutes_js_1.default);
// Register feature routes above these two handlers.
app.use(notFound_js_1.notFound);
app.use(errorHandler_js_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map