import type { Request, Response, NextFunction } from "express";
import { reportQuerySchema } from "../validators/reportValidator";
import { getUsersReport,  exportUsersReport } from "../services/reportService";

export async function getReport(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = reportQuerySchema.safeParse(req.query);
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
    const data = await getUsersReport(parsed.data);

    return res.json({
      success: true,
      message: "Report generated successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function exportReport(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = reportQuerySchema.safeParse(req.query);

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

    const csv = await exportUsersReport(parsed.data);

    const filename = `users-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    return res.send(csv);
  } catch (err) {
    next(err);
  }
}