
import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";

const PORT = Number(process.env.PORT) || 3007;
const MONGODB_URI = process.env.MONGODB_URI;

async function startServer(): Promise<void> {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured in .env");
  }

  await mongoose.connect(MONGODB_URI);
  console.log("MongoDB connected successfully");

  const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });

  const shutdown = async () => {
    console.log("Shutting down server...");

    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer().catch((error: unknown) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
