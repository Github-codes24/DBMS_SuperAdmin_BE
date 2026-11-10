"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const apiManager_js_1 = require("../utils/apiManager.js");
const errorHandler = (err, req, res, _next) => {
    const error = err instanceof Error ? err : new Error("Unknown error");
    const statusCode = typeof err?.statusCode === "number"
        ? err.statusCode
        : typeof err?.status === "number"
            ? err.status
            : 500;
    const code = typeof err?.code === "string"
        ? err.code
        : statusCode === 500
            ? "INTERNAL_SERVER_ERROR"
            : "REQUEST_ERROR";
    // Log internal error details on the server.
    console.error("[API Error]", {
        requestId: res.locals.requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode,
        code,
        headersSent: res.headersSent,
        message: error.message,
        stack: error.stack,
    });
    // Avoid sending a second response.
    if (res.headersSent) {
        return;
    }
<<<<<<< HEAD
    const statusCode = typeof err?.statusCode === "number" ? err.statusCode : 500;
    const code = typeof err?.code === "string"
        ? err.code
        : statusCode === 500
            ? "INTERNAL_SERVER_ERROR"
            : "ERROR";
    const message = statusCode >= 500 ? "An unexpected error occurred" : error.message;
    return apiManager_js_1.apiManager.failure(res, message, statusCode, code);
=======
    const clientMessage = error.message || "An unexpected error occurred";
    return apiManager_js_1.apiManager.failure(res, clientMessage, statusCode, code, {
        details: error.message,
        name: error.name,
    });
>>>>>>> develop
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map