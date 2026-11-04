"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.audit = audit;
const auditLog_1 = require("../models/auditLog");
async function audit(event, d) {
    try {
        await auditLog_1.AuditLog.create({ event, ...d });
    }
    catch (e) {
        console.error("audit failed", e); // a logging failure must never break the request
    }
}
//# sourceMappingURL=audit.service.js.map