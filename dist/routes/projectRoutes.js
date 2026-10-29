"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const projectController_js_1 = require("../controllers/projectController.js");
const authenticate_js_1 = require("../middleware/authenticate.js");
const requireSuperAdmin_js_1 = require("../middleware/requireSuperAdmin.js");
const validate_js_1 = require("../middleware/validate.js");
const projectAdminValidator_js_1 = require("../validators/projectAdminValidator.js");
const projectAdminController_js_1 = require("../controllers/projectAdminController.js");
const router = (0, express_1.Router)();
router.use(authenticate_js_1.authenticate, requireSuperAdmin_js_1.requireSuperAdmin);
router.post("/create", projectController_js_1.createProject);
router.get("/", projectController_js_1.getProjects);
router.post("/:projectId/admins", (0, validate_js_1.validate)(projectAdminValidator_js_1.createProjectAdminSchema), projectAdminController_js_1.createProjectAdminController);
exports.default = router;
//# sourceMappingURL=projectRoutes.js.map