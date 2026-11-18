"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReport = getReport;
const reportValidator_1 = require("../validators/reportValidator");
const reportService_1 = require("../services/reportService");
async function getReport(req, res, next) {
    try {
        const parsed = reportValidator_1.reportQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid report filters",
                errors: parsed.error.issues.map((i) => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        // only "users" exists today; add more report types here later
        const data = await (0, reportService_1.getUsersReport)(parsed.data);
        return res.json({
            success: true,
            message: "Report generated successfully",
            data,
        });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=reportController.js.map