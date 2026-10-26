"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiManager = void 0;
exports.apiManager = {
    success(res, message, data, statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            ...(data === undefined ? {} : { data }),
            ...(res.locals.requestId
                ? { requestId: res.locals.requestId }
                : {}),
        });
    },
    failure(res, message, statusCode = 500, code = "INTERNAL_SERVER_ERROR") {
        return res.status(statusCode).json({
            success: false,
            message,
            error: { code },
            ...(res.locals.requestId
                ? { requestId: res.locals.requestId }
                : {}),
        });
    },
    getBearerToken(req) {
        const authorization = req.get("authorization");
        const match = authorization?.match(/^Bearer\s+(.+)$/i);
        return match?.[1];
    },
    getRequestMetadata(req) {
        return {
            requestId: req.get("x-request-id"),
            projectId: req.get("x-project-id") || undefined,
            authorizationPresent: Boolean(req.get("authorization")),
        };
    },
};
//# sourceMappingURL=apiManager.js.map