"use strict";
// utils/httpError.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpError = httpError;
exports.isDuplicateKey = isDuplicateKey;
function httpError(statusCode, code, message) {
    return Object.assign(new Error(message), { statusCode, code });
}
function isDuplicateKey(e) {
    return typeof e === "object" && e !== null && e.code === 11000;
}
//# sourceMappingURL=httpError.js.map