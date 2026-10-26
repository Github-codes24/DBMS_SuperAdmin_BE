import type { RequestHandler } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { apiManager } from "../utils/apiManager.js";

interface AccessTokenPayload extends JwtPayload {
  role: string;
  projectIds: string[];
}

export const authenticate: RequestHandler = (req, res, next) => {
  const token = apiManager.getBearerToken(req);

  if (!token) {
    return apiManager.failure(
      res,
      "Authentication required",
      401,
      "AUTHENTICATION_REQUIRED",
    );
  }

  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret || secret.length < 32) {
    return next(
      new Error(
        "JWT_ACCESS_SECRET must be configured with at least 32 characters",
      ),
    );
  }

  try {
    const payload = jwt.verify(token, secret, {
      issuer: "dbms-superadmin-api",
      audience: "dbms-superadmin",
    }) as AccessTokenPayload;

    res.locals.auth = {
      userId: payload.sub,
      role: payload.role,
      projectIds: payload.projectIds ?? [],
    };

    next();
  } catch {
    return apiManager.failure(
      res,
      "Invalid or expired access token",
      401,
      "INVALID_ACCESS_TOKEN",
    );
  }
};