
import type { RequestHandler } from "express";
import { AuthServiceError, loginUser } from "../services/authService.js";
import type { LoginInput } from "../validators/authValidator.js";
import { apiManager } from "../utils/apiManager.js";

export const login: RequestHandler = async (_req, res, next) => {
  try {
    const validated = res.locals.validated as { body: LoginInput };

    const result = await loginUser(
      validated.body.email,
      validated.body.password,
    );

    return apiManager.success(res, "Login successful", result);
  } catch (error: unknown) {
    if (error instanceof AuthServiceError) {
      return apiManager.failure(
        res,
        error.message,
        error.statusCode,
        error.code,
      );
    }

    return next(error);
  }
};

