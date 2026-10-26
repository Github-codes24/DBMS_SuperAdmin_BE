"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_js_1 = require("../controllers/userController.js");
const authenticate_js_1 = require("../middleware/authenticate.js");
const authorize_js_1 = require("../middleware/authorize.js");
const validate_js_1 = require("../middleware/validate.js");
const userValidator_js_1 = require("../validators/userValidator.js");
const router = (0, express_1.Router)();
// All user management routes require authentication and at least admin role
router.use(authenticate_js_1.authenticate);
router.use((0, authorize_js_1.authorize)("superadmin", "admin"));
// List users with filtering, searching, and pagination
router.get("/", (0, validate_js_1.validate)(userValidator_js_1.listUsersSchema), userController_js_1.getUsers);
// Create new user
router.post("/", (0, validate_js_1.validate)(userValidator_js_1.createUserSchema), userController_js_1.createUser);
// Get specific user by ID
router.get("/:id", (0, validate_js_1.validate)(userValidator_js_1.getUserSchema), userController_js_1.getUser);
// Update user details
router.put("/:id", (0, validate_js_1.validate)(userValidator_js_1.updateUserSchema), userController_js_1.updateUser);
// Toggle user active / inactive status
router.patch("/:id/status", (0, validate_js_1.validate)(userValidator_js_1.updateUserStatusSchema), userController_js_1.updateUserStatus);
// Reset user password
router.post("/:id/reset-password", (0, validate_js_1.validate)(userValidator_js_1.resetPasswordSchema), userController_js_1.resetPassword);
// Delete user (Super Admin only)
router.delete("/:id", (0, authorize_js_1.authorize)("superadmin"), (0, validate_js_1.validate)(userValidator_js_1.deleteUserSchema), userController_js_1.deleteUser);
exports.default = router;
//# sourceMappingURL=userRoutes.js.map