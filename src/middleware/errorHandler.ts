import type { ErrorRequestHandler } from "express";
import { apiManager } from "../utils/apiManager.js";

export const errorHandler: ErrorRequestHandler = (
  err,
  req,
  res,
  _next,
) => {
  const error = err instanceof Error ? err : new Error("Unknown error");

  // Log internal error details on the server.
  console.error("[API Error]", {
    requestId: res.locals.requestId,
    method: req.method,
    url: req.originalUrl,
    headersSent: res.headersSent,
    message: error.message,
    stack: error.stack,
  }
  );

  // Avoid sending a second response.
  if (res.headersSent) {
    return;
  }

  return apiManager.failure(
    res,
    "An unexpected error occurred",
    500,
    "INTERNAL_SERVER_ERROR",
  );
};