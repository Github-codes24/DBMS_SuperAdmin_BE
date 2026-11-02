"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const permissionController_js_1 = require("../controllers/permissionController.js");
const authenticate_js_1 = require("../middleware/authenticate.js");
const requireSuperAdmin_js_1 = require("../middleware/requireSuperAdmin.js");
const router = (0, express_1.Router)();
router.use(authenticate_js_1.authenticate, requireSuperAdmin_js_1.requireSuperAdmin);
router.post("/", permissionController_js_1.createPermission);
router.get("/", permissionController_js_1.getPermissions);
exports.default = router;
//# sourceMappingURL=permissionRoutes.js.map