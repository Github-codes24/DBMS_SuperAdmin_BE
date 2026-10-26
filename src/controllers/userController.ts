import type { RequestHandler } from "express";
import {
  createUser as createUserService,
  deleteUser as deleteUserService,
  getUserById,
  listUsers,
  resetUserPassword as resetUserPasswordService,
  updateUser as updateUserService,
  updateUserStatus as updateUserStatusService,
  UserServiceError,
  type CurrentAuth,
} from "../services/userService.js";
import { apiManager } from "../utils/apiManager.js";
import type {
  CreateUserInput,
  ListUsersQuery,
  ResetPasswordInput,
  UpdateUserInput,
  UpdateUserStatusInput,
} from "../validators/userValidator.js";

function handleUserError(error: unknown, res: any, next: any) {
  if (error instanceof UserServiceError) {
    return apiManager.failure(
      res,
      error.message,
      error.statusCode,
      error.code,
    );
  }
  return next(error);
}

export const getUsers: RequestHandler = async (_req, res, next) => {
  try {
    const validated = res.locals.validated as { query: ListUsersQuery };
    const auth = res.locals.auth as CurrentAuth;

    const result = await listUsers(validated.query, auth);

    return apiManager.success(res, "Users retrieved successfully", result);
  } catch (error: unknown) {
    return handleUserError(error, res, next);
  }
};

export const getUser: RequestHandler = async (_req, res, next) => {
  try {
    const validated = res.locals.validated as { params: { id: string } };

    const result = await getUserById(validated.params.id);

    return apiManager.success(res, "User retrieved successfully", result);
  } catch (error: unknown) {
    return handleUserError(error, res, next);
  }
};

export const createUser: RequestHandler = async (_req, res, next) => {
  try {
    const validated = res.locals.validated as { body: CreateUserInput };
    const auth = res.locals.auth as CurrentAuth;

    const result = await createUserService(validated.body, auth);

    return apiManager.success(res, "User created successfully", result, 201);
  } catch (error: unknown) {
    return handleUserError(error, res, next);
  }
};

export const updateUser: RequestHandler = async (_req, res, next) => {
  try {
    const validated = res.locals.validated as {
      params: { id: string };
      body: UpdateUserInput;
    };
    const auth = res.locals.auth as CurrentAuth;

    const result = await updateUserService(
      validated.params.id,
      validated.body,
      auth,
    );

    return apiManager.success(res, "User updated successfully", result);
  } catch (error: unknown) {
    return handleUserError(error, res, next);
  }
};

export const updateUserStatus: RequestHandler = async (_req, res, next) => {
  try {
    const validated = res.locals.validated as {
      params: { id: string };
      body: UpdateUserStatusInput;
    };
    const auth = res.locals.auth as CurrentAuth;

    const result = await updateUserStatusService(
      validated.params.id,
      validated.body.isActive,
      auth,
    );

    return apiManager.success(res, "User status updated successfully", result);
  } catch (error: unknown) {
    return handleUserError(error, res, next);
  }
};

export const resetPassword: RequestHandler = async (_req, res, next) => {
  try {
    const validated = res.locals.validated as {
      params: { id: string };
      body: ResetPasswordInput;
    };
    const auth = res.locals.auth as CurrentAuth;

    const result = await resetUserPasswordService(
      validated.params.id,
      validated.body.password,
      auth,
    );

    return apiManager.success(
      res,
      "User password reset successfully",
      result,
    );
  } catch (error: unknown) {
    return handleUserError(error, res, next);
  }
};

export const deleteUser: RequestHandler = async (_req, res, next) => {
  try {
    const validated = res.locals.validated as { params: { id: string } };
    const auth = res.locals.auth as CurrentAuth;

    const result = await deleteUserService(validated.params.id, auth);

    return apiManager.success(res, "User deleted successfully", result);
  } catch (error: unknown) {
    return handleUserError(error, res, next);
  }
};
