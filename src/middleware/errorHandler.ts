
import type { ErrorRequestHandler } from "express";
import { apiManager } from "../utils/apiManager.js";

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req,
  res,
  _next,
) => {
  const error = err instanceof Error ? err : new Error("Unknown error");

  // Keep internal details in server logs, not in production responses.
  console.error("[API Error]", {
    requestId: res.locals.requestId,
    message: error.message,
  });

  apiManager.failure(
    res,
    "An unexpected error occurred",
    500,
    "INTERNAL_SERVER_ERROR",
  );
};
