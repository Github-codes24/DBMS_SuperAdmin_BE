"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrap = exports.ok = void 0;
const ok = (res, data, status = 200) => res.status(status).
    json({ success: true, data
});
exports.ok = ok;
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next))
    .catch(next);
exports.wrap = wrap;
//# sourceMappingURL=helpers.js.map