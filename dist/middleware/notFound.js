"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = void 0;
const apiManager_js_1 = require("../utils/apiManager.js");
const notFound = (req, res) => {
    apiManager_js_1.apiManager.failure(res, `Route not found: ${req.method} ${req.path}`, 404, "ROUTE_NOT_FOUND");
};
exports.notFound = notFound;
//# sourceMappingURL=notFound.js.map