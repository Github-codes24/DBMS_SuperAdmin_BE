"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const apiManager_js_1 = require("../utils/apiManager.js");
const errorHandler = (err, req, res, _next) => {
    const error = err instanceof Error ? err : new Error("Unknown error");
    // Log internal error details on the server.
    console.error("[API Error]", {
        requestId: res.locals.requestId,
        method: req.method,
        url: req.originalUrl,
        headersSent: res.headersSent,
        message: error.message,
        stack: error.stack,
    });
    // Avoid sending a second response.
    if (res.headersSent) {
        return;
    }
    return apiManager_js_1.apiManager.failure(res, "An unexpected error occurred", 500, "INTERNAL_SERVER_ERROR");
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map