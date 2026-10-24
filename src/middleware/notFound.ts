
import type { RequestHandler } from "express";
import { apiManager } from "../utils/apiManager.js";

export const notFound: RequestHandler = (req, res) => {
  apiManager.failure(
    res,
    `Route not found: ${req.method} ${req.path}`,
    404,
    "ROUTE_NOT_FOUND",
  );
};
