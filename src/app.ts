
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { requestContext } from "./middleware/requestContext.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiManager } from "./utils/apiManager.js";
import authRoutes from "./routes/authRoutes.js";
import testRoutes from "./routes/testRoutes.js";
// import userRoutes from "./routes/userRoutes.js";
import userRoutes from "./routes/userRoutes.js";
// import roleRoutes from "./routes/rolesRoutes.js";
import permissionRoutes from "./routes/permissionRoutes.js";
import platformRoutes from "./routes/platformRoutes.js";
// import projectRoutes from "./routes/projectRoutes.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

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

app.use(
  cors({
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
  }),
);


app.use((req, res, next) => {
  console.log("[REQUEST START]", {
    requestId: res.locals.requestId,
    method: req.method,
    url: req.originalUrl,
  });

  const originalJson = res.json.bind(res);

  res.json = ((...args: any[]) => {
    console.trace("[RESPONSE SENT]", {
      requestId: res.locals.requestId,
      method: req.method,
      url: req.originalUrl,
    });

    return originalJson(...args);
  }) as typeof res.json;

  next();
});
app.use(requestContext);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  return apiManager.success(res, "DBMS Super Admin API is running", {
    service: "dbms-superadmin-api",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/users", userRoutes);
// app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionRoutes);
// app.use("/api/projects", projectRoutes);
app.use("/api/platform", platformRoutes);

// Register feature routes above these two handlers.
app.use(notFound);
app.use(errorHandler);




export default app;
