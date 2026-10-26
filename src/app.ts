
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { requestContext } from "./middleware/requestContext.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiManager } from "./utils/apiManager.js";
import authRoutes from "./routes/authRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    exposedHeaders: ["X-Request-ID"],
  }),
);

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

// Register feature routes above these two handlers.
app.use(notFound);
app.use(errorHandler);

export default app;
