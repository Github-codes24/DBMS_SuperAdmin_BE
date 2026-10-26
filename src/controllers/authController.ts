
import type { RequestHandler } from "express";
import { AuthServiceError, refreshUserTokens,loginUser,logoutUser,  getAdminProfile as getAdminProfileService, changePassword, } from "../services/authService.js";
import type { ChangePasswordInput, LoginInput } from "../validators/authValidator.js";
import { apiManager } from "../utils/apiManager.js";
import { Request, Response } from "express";
import {User} from "../models/User.js"
import { Types } from "mongoose";

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
export const refreshToken: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const { refreshToken } = req.body ?? {};

    if (
      typeof refreshToken !== "string" ||
      !refreshToken.trim()
    ) {
      return apiManager.failure(
        res,
        "Refresh token is required",
        400,
        "REFRESH_TOKEN_REQUIRED",
      );
    }

    const result = await refreshUserTokens(refreshToken);

    return apiManager.success(
      res,
      "Access token refreshed successfully",
      result,
    );
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
export const getAdminProfile: RequestHandler = async (_req, res, next) => {
  try {
    const auth = res.locals.auth;
    if (!auth?.userId) {
      return apiManager.failure(
        res,
        "Authentication required",
        401,
        "AUTHENTICATION_REQUIRED",
      );
    }
    const admin = await getAdminProfileService(auth.userId);
    return apiManager.
    success(
      res, 
      "Admin profile fetched",
       admin);
  } catch (error) {
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
// export const logout: RequestHandler = async (_req, res, next) => {
//   try {
//     await logoutUser();

//     return apiManager.success(
//       res,
//       "Logout successful",
//       null,
//     );
//   } catch (error: unknown) {
//     return next(error);
//   }
// };
export const logout: RequestHandler = async (req, res, next) => {
  try {
    const auth = res.locals.auth as {
      userId: string;
    };

    const { refreshToken } = req.body as {
      refreshToken: string;
    };

    if (!refreshToken) {
      return apiManager.failure(
        res,
        "Refresh token is required",
        400,
        "REFRESH_TOKEN_REQUIRED",
      );
    }

    await logoutUser(auth.userId, refreshToken);

    return apiManager.success(
      res,
      "Logout successful",
      null,
    );
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
export const changePasswordController: RequestHandler = async (
  _req,
  res,
  next,
) => {
  try {
    const auth = res.locals.auth as {
      userId: string;
    };

    const validated = res.locals.validated as {
      body: ChangePasswordInput;
    };

    const { currentPassword, newPassword } = validated.body;

    await changePassword(
      auth.userId,
      currentPassword,
      newPassword,
    );

    return apiManager.success(
      res,
      "Password changed successfully. Please log in again.",
      null,
    );
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