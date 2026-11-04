"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = void 0;
const apiManager_js_1 = require("../utils/apiManager.js");
// export const notFound: RequestHandler = (req, res) => {
//   apiManager.failure(
//     res,
//     `Route not found: ${req.method} ${req.path}`,
//     404,
//     "ROUTE_NOT_FOUND",
//   );
// };
const notFound = (req, res) => {
    // console.log("[NOT FOUND]", {
    //   requestId: res.locals.requestId,
    //   method: req.method,
    //   url: req.originalUrl,
    // });
    return apiManager_js_1.apiManager.failure(res, `Route not found: ${req.method} ${req.path}`, 404, "ROUTE_NOT_FOUND");
};
exports.notFound = notFound;
//# sourceMappingURL=notFound.js.map