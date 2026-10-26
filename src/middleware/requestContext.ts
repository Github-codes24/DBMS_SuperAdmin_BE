
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestContext: RequestHandler = (req, res, next) => {
  const incomingId = req.get("x-request-id");

  // Accept only a short, safe request ID; otherwise generate our own.
  const isSafeId =
    incomingId !== undefined &&
    incomingId.length <= 128 &&
    /^[a-zA-Z0-9._-]+$/.test(incomingId);

  const requestId = isSafeId ? incomingId : randomUUID();

  res.locals.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);

  next();
};
