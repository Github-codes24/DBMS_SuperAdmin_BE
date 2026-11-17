import type { Request, Response, NextFunction } from "express";
import { reportQuerySchema } from "../validators/reportValidator";
import { getUsersReport } from "../services/reportService";

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