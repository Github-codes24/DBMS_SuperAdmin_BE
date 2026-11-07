import type { ErrorRequestHandler } from "express";
import { apiManager } from "../utils/apiManager.js";

export const errorHandler: ErrorRequestHandler = (
  err,
  req,
  res,
  _next,
) => {
  const error = err instanceof Error ? err : new Error("Unknown error");

  const statusCode =
    typeof (err as { statusCode?: unknown })?.statusCode === "number"
      ? (err as { statusCode: number }).statusCode
      : typeof (err as { status?: unknown })?.status === "number"
      ? (err as { status: number }).status
      : 500;

  const code =
    typeof (err as { code?: unknown })?.code === "string"
      ? (err as { code: string }).code
      : statusCode === 500
      ? "INTERNAL_SERVER_ERROR"
      : "REQUEST_ERROR";

  // Log internal error details on the server.
  console.error("[API Error]", {
    requestId: res.locals.requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    code,
    headersSent: res.headersSent,
    message: error.message,
    stack: error.stack,
  });

  // Avoid sending a second response.
  if (res.headersSent) {
    return;
  }

  const clientMessage = error.message || "An unexpected error occurred";

  return apiManager.failure(res, clientMessage, statusCode, code, {
    details: error.message,
    name: error.name,
  });
};
