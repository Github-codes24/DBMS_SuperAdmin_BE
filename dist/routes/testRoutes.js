"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_js_1 = require("../middleware/authenticate.js");
const apiManager_js_1 = require("../utils/apiManager.js");
const router = (0, express_1.Router)();
router.get("/protected", authenticate_js_1.authenticate, (_req, res) => {
    return apiManager_js_1.apiManager.success(res, "Protected route accessed successfully", {
        authenticated: true,
        auth: res.locals.auth,
    });
});
exports.default = router;
//# sourceMappingURL=testRoutes.js.map