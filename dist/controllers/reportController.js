"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReport = getReport;
exports.exportReport = exportReport;
exports.getRolesReportController = getRolesReportController;
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
async function exportReport(req, res, next) {
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
        const csv = await (0, reportService_1.exportUsersReport)(parsed.data);
        const filename = `users-report-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(csv);
    }
    catch (err) {
        next(err);
    }
}
async function getRolesReportController(req, res, next) {
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
        const data = await (0, reportService_1.getRolesReport)(parsed.data);
        return res.json({
            success: true,
            message: "Role-wise user report generated successfully",
            data,
        });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=reportController.js.map