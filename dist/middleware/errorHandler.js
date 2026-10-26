"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const apiManager_js_1 = require("../utils/apiManager.js");
const errorHandler = (err, _req, res, _next) => {
    const error = err instanceof Error ? err : new Error("Unknown error");
    // Keep internal details in server logs, not in production responses.
    console.error("[API Error]", {
        requestId: res.locals.requestId,
        message: error.message,
    });
    apiManager_js_1.apiManager.failure(res, "An unexpected error occurred", 500, "INTERNAL_SERVER_ERROR");
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map