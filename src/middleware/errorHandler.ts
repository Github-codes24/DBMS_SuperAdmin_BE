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

  const statusCode =
    typeof (err as any)?.statusCode === "number" ? (err as any).statusCode : 500;
  const code =
    typeof (err as any)?.code === "string"
      ? (err as any).code
      : statusCode === 500
        ? "INTERNAL_SERVER_ERROR"
        : "ERROR";
  const message =
    statusCode >= 500 ? "An unexpected error occurred" : error.message;

  return apiManager.failure(
    res,
    message,
    statusCode,
    code,
  );
};