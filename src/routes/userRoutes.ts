import { Router } from "express";
import {
  createUser,
  deleteUser,
  getUser,
  getUsers,
  resetPassword,
  updateUser,
  updateUserStatus,
} from "../controllers/userController.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import {
  createUserSchema,
  deleteUserSchema,
  getUserSchema,
  listUsersSchema,
  resetPasswordSchema,
  updateUserSchema,
  updateUserStatusSchema,
} from "../validators/userValidator.js";

const router = Router();

// All user management routes require authentication and at least admin role
router.use(authenticate);
router.use(authorize("superadmin", "admin"));

// List users with filtering, searching, and pagination
router.get("/", validate(listUsersSchema), getUsers);

// Create new user
router.post("/", validate(createUserSchema), createUser);

// Get specific user by ID
router.get("/:id", validate(getUserSchema), getUser);

// Update user details
router.put("/:id", validate(updateUserSchema), updateUser);

// Toggle user active / inactive status
router.patch("/:id/status", validate(updateUserStatusSchema), updateUserStatus);

// Reset user password
router.post(
  "/:id/reset-password",
  validate(resetPasswordSchema),
  resetPassword,
);

// Delete user (Super Admin only)
router.delete(
  "/:id",
  authorize("superadmin"),
  validate(deleteUserSchema),
  deleteUser,
);

export default router;
