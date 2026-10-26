"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_js_1 = require("../controllers/authController.js");
const validate_js_1 = require("../middleware/validate.js");
const authValidator_js_1 = require("../validators/authValidator.js");
const authService_js_1 = require("../services/authService.js");
const authenticate_js_1 = require("../middleware/authenticate.js");
const router = (0, express_1.Router)();
router.post("/login", (0, validate_js_1.validate)(authValidator_js_1.loginSchema), authController_js_1.login);
router.get("/getAdmin", authenticate_js_1.authenticate, authService_js_1.getAdminProfile);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map