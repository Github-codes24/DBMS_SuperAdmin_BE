/**
 * Telecaller CRM — Report Controller
 * Handles notification report listing and PDF print generation.
 */
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';
import { getNotificationReport, streamNotificationPDF } from '../services/report.service.js';

// ─── GET /api/telecaller/report/notifications ─────────────────────────────────

/**
 * @desc   Get paginated notification report with summary counters
 * @route  GET /api/telecaller/report/notifications
 * @access Private (Telecaller)
 *
 * Query: customer, fromDate, toDate, page, limit
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const { customer, fromDate, toDate, page = 1, limit = 10 } = req.query;

  const report = await getNotificationReport({
    customer,
    fromDate,
    toDate,
    page: Math.max(1, parseInt(page)),
    limit: Math.min(100, Math.max(1, parseInt(limit))),
  });

  return sendSuccess(res, 'Notification report fetched successfully', report);
});

// ─── GET /api/telecaller/report/notifications/print ──────────────────────────
/**
 * @desc   Generate and stream a printable PDF of the notification report
 * @route  GET /api/telecaller/report/notifications/print
 * @access Private (Telecaller)
 *
 * Query: customer, fromDate, toDate (same as list, no pagination — fetches all)
 */
export const printNotifications = asyncHandler(async (req, res) => {
  const { customer, fromDate, toDate } = req.query;

  // Fetch all records for the PDF (high limit, page 1)
  const report = await getNotificationReport({
    customer,
    fromDate,
    toDate,
    page: 1,
    limit: 10000, // Effectively fetch all records for the PDF
  });

  // Stream PDF directly to response
  streamNotificationPDF(res, report);
});
