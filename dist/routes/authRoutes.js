"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_js_1 = require("../controllers/authController.js");
const validate_js_1 = require("../middleware/validate.js");
const authValidator_js_1 = require("../validators/authValidator.js");
// import { getAdminProfile } from "../controllers/authController.js";
const authenticate_js_1 = require("../middleware/authenticate.js");
const router = (0, express_1.Router)();
router.post("/login", (0, validate_js_1.validate)(authValidator_js_1.loginSchema), authController_js_1.login);
router.post("/refresh", authController_js_1.refreshToken);
router.get("/getAdmin", authenticate_js_1.authenticate, authController_js_1.getAdminProfile);
router.post("/logout", authenticate_js_1.authenticate, authController_js_1.logout);
router.patch("/change-password", authenticate_js_1.authenticate, (0, validate_js_1.validate)(authValidator_js_1.changePasswordSchema), authController_js_1.changePasswordController);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map