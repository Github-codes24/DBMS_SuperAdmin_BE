"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestContext = void 0;
const node_crypto_1 = require("node:crypto");
const requestContext = (req, res, next) => {
    const incomingId = req.get("x-request-id");
    // Accept only a short, safe request ID; otherwise generate our own.
    const isSafeId = incomingId !== undefined &&
        incomingId.length <= 128 &&
        /^[a-zA-Z0-9._-]+$/.test(incomingId);
    const requestId = isSafeId ? incomingId : (0, node_crypto_1.randomUUID)();
    res.locals.requestId = requestId;
    res.setHeader("X-Request-ID", requestId);
    next();
};
exports.requestContext = requestContext;
//# sourceMappingURL=requestContext.js.map