"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roleController_js_1 = require("../controllers/roleController.js");
const authenticate_js_1 = require("../middleware/authenticate.js");
const router = (0, express_1.Router)();
// router.use(authenticate, requireSuperAdmin);
// router.post("/", createRole);
// router.get("/", getRoles);
// router.patch("/:id", updateRole);
// SuperAdmin or Project Admin
router.post("/:projectId/roles", authenticate_js_1.authenticate, roleController_js_1.createRole);
router.get("/:projectId/roles", authenticate_js_1.authenticate, roleController_js_1.getRolesByProject);
router.post("/:projectId/users/:userId/assign-role", authenticate_js_1.authenticate, roleController_js_1.assignRoleToUser);
exports.default = router;
//# sourceMappingURL=rolesRoutes.js.map