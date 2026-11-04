"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actorId = void 0;
exports.param = param;
const httpError_js_1 = require("./httpError.js");
const actorId = (req) => String(req.user?._id ?? req.user?.id);
exports.actorId = actorId;
/** Always returns a single string, whatever the Express typings say. */
// function param   
function param(req, name) {
    const v = req.params[name];
    const s = Array.isArray(v) ? v[0] : v;
    if (!s)
        throw (0, httpError_js_1.httpError)(400, "MISSING_PARAM", `Missing ${name}`);
    return s;
}
//# sourceMappingURL=request.js.map