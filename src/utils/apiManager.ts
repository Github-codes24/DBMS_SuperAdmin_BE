
import type { Request, Response } from "express";

export const apiManager = {
  success<T>(
    res: Response,
    message: string,
    data?: T,
    statusCode = 200,
  ) {
    return res.status(statusCode).json({
      success: true,
      message,
      ...(data === undefined ? {} : { data }),
      ...(res.locals.requestId
        ? { requestId: res.locals.requestId as string }
        : {}),
    });
  },

  failure(
    res: Response,
    message: string,
    statusCode = 500,
    code = "INTERNAL_SERVER_ERROR",
  ) {
    return res.status(statusCode).json({
      success: false,
      message,
      error: { code },
      ...(res.locals.requestId
        ? { requestId: res.locals.requestId as string }
        : {}),
    });
  },

  getBearerToken(req: Request): string | undefined {
    const authorization = req.get("authorization");
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    return match?.[1];
  },

  getRequestMetadata(req: Request) {
    return {
      requestId: req.get("x-request-id"),
      projectId: req.get("x-project-id") || undefined,
      authorizationPresent: Boolean(req.get("authorization")),
    };
  },
};
