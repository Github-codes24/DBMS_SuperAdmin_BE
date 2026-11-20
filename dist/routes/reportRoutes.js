"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reportController_1 = require("../controllers/reportController");
const authenticate_1 = require("../middleware/authenticate");
const router = (0, express_1.Router)();
router.get("/", authenticate_1.authenticate, reportController_1.getReport);
router.get("/export", authenticate_1.authenticate, reportController_1.exportReport);
exports.default = router;
//# sourceMappingURL=reportRoutes.js.map