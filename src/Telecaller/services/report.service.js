// /**
//  * Telecaller CRM — Report Service
//  * Aggregation logic for notification reports and PDF generation.
// //  */
// // import mongoose from 'mongoose';
// // import VendorNotification from '../models/VendorNotification.js';
// // import PDFDocument from 'pdfkit';

// // // ─── Notification Report Aggregation ─────────────────────────────────────────

// // /**
// //  * Fetch paginated notification report with optional filters.
// //  *
// //  * @param {object} filters
// //  * @param {string} [filters.customer]   - Filter by customerName (partial match)
// //  * @param {string} [filters.fromDate]   - ISO date string
// //  * @param {string} [filters.toDate]     - ISO date string
// //  * @param {number} [filters.page]
// //  * @param {number} [filters.limit]
// //  * @returns {Promise<object>}
// //  */
// // export const getNotificationReport = async ({ customer, fromDate, toDate, page = 1, limit = 10 }) => {
// //   const skip = (page - 1) * limit;

// //   const matchStage = {};

// //   if (customer) {
// //     matchStage.customerName = { $regex: customer, $options: 'i' };
// //   }

// //   if (fromDate || toDate) {
// //     matchStage.sentAt = {};
// //     if (fromDate) matchStage.sentAt.$gte = new Date(fromDate);
// //     if (toDate) {
// //       const to = new Date(toDate);
// //       to.setHours(23, 59, 59, 999);
// //       matchStage.sentAt.$lte = to;
// //     }
// //   }

// //   const pipeline = [
// //     { $match: matchStage },

// //     // Lookup vendor info
// //     {
// //       $lookup: {
// //         from: 'vendors',
// //         localField: 'vendorId',
// //         foreignField: '_id',
// //         as: 'vendor',
// //       },
// //     },
// //     {
// //       $unwind: {
// //         path: '$vendor',
// //         preserveNullAndEmpty: true,
// //       },
// //     },

// //     // Compute summary fields
// //     {
// //       $facet: {
// //         // Summary counters
// //         summary: [
// //           {
// //             $group: {
// //               _id: null,
// //               total: { $sum: 1 },
// //               delivered: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'Delivered'] }, 1, 0] } },
// //               pending: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'Pending'] }, 1, 0] } },
// //               failed: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'Failed'] }, 1, 0] } },
// //             },
// //           },
// //         ],
// //         // Paginated records
// //         records: [
// //           { $sort: { sentAt: -1 } },
// //           { $skip: skip },
// //           { $limit: limit },
// //           {
// //             $project: {
// //               _id: 1,
// //               customerName: 1,
// //               channel: 1,
// //               message: 1,
// //               deliveryStatus: 1,
// //               sentAt: 1,
// //               'vendor._id': 1,
// //               'vendor.fullName': 1,
// //               'vendor.storeName': 1,
// //               'vendor.vendorId': 1,
// //             },
// //           },
// //         ],
// //         // Total count for pagination
// //         totalCount: [{ $count: 'count' }],
// //       },
// //     },
// //   ];

// //   const [result] = await VendorNotification.aggregate(pipeline);

// //   const summary = result.summary[0] || { total: 0, delivered: 0, pending: 0, failed: 0 };
// //   const totalRecords = result.totalCount[0]?.count || 0;

// //   return {
// //     summary: {
// //       total: summary.total,
// //       delivered: summary.delivered,
// //       pending: summary.pending,
// //       failed: summary.failed,
// //     },
// //     pagination: {
// //       page,
// //       limit,
// //       totalRecords,
// //       totalPages: Math.ceil(totalRecords / limit),
// //     },
// //     records: result.records,
// //   };
// // };

// // // ─── PDF Generation ───────────────────────────────────────────────────────────

// // /**
// //  * Stream a printable PDF of the notification report to the response object.
// //  *
// //  * @param {object} res    - Express response object (writable stream)
// //  * @param {object} reportData - Report data returned by getNotificationReport()
// //  */
// // export const streamNotificationPDF = (res, reportData) => {
// //   const doc = new PDFDocument({ margin: 40, size: 'A4' });

// //   res.setHeader('Content-Type', 'application/pdf');
// //   res.setHeader('Content-Disposition', `attachment; filename=notification-report-${Date.now()}.pdf`);

// //   doc.pipe(res);

// //   // ── Title ──────────────────────────────────────────────────────────────────
// //   doc.fontSize(18).font('Helvetica-Bold').text('LTS Telecaller CRM', { align: 'center' });
// //   doc.fontSize(13).font('Helvetica').text('Notification Report', { align: 'center' });
// //   doc.moveDown(0.5);
// //   doc.fontSize(9).text(`Generated: ${new Date().toLocaleString('en-IN')}`, { align: 'right' });
// //   doc.moveDown(1);

// //   // ── Summary ────────────────────────────────────────────────────────────────
// //   doc.fontSize(11).font('Helvetica-Bold').text('Summary');
// //   doc.moveDown(0.3);
// //   doc.fontSize(10).font('Helvetica');
// //   doc.text(`Total Notifications : ${reportData.summary.total}`);
// //   doc.text(`Delivered           : ${reportData.summary.delivered}`);
// //   doc.text(`Pending             : ${reportData.summary.pending}`);
// //   doc.text(`Failed              : ${reportData.summary.failed}`);
// //   doc.moveDown(1);

// //   // ── Table Header ───────────────────────────────────────────────────────────
// //   doc.fontSize(10).font('Helvetica-Bold');
// //   const tableTop = doc.y;
// //   const colX = { no: 40, customer: 70, channel: 200, status: 270, vendor: 340, sentAt: 460 };

// //   doc.text('#',          colX.no,      tableTop);
// //   doc.text('Customer',   colX.customer, tableTop);
// //   doc.text('Channel',    colX.channel,  tableTop);
// //   doc.text('Status',     colX.status,   tableTop);
// //   doc.text('Vendor',     colX.vendor,   tableTop);
// //   doc.text('Sent At',    colX.sentAt,   tableTop);
// //   doc.moveDown(0.4);

// //   // Horizontal rule
// //   doc.moveTo(40, doc.y).lineTo(560, doc.y).stroke();
// //   doc.moveDown(0.3);

// //   // ── Table Rows ─────────────────────────────────────────────────────────────
// //   doc.fontSize(9).font('Helvetica');

// //   reportData.records.forEach((rec, idx) => {
// //     if (doc.y > 700) {
// //       doc.addPage();
// //     }

// //     const y = doc.y;
// //     const sentAt = rec.sentAt ? new Date(rec.sentAt).toLocaleDateString('en-IN') : '-';
// //     const vendorName = rec.vendor?.storeName || rec.vendor?.fullName || '-';

// //     doc.text(String(idx + 1),            colX.no,      y, { width: 25 });
// //     doc.text(rec.customerName || '-',    colX.customer, y, { width: 125 });
// //     doc.text(rec.channel || '-',         colX.channel,  y, { width: 65 });
// //     doc.text(rec.deliveryStatus || '-',  colX.status,   y, { width: 65 });
// //     doc.text(vendorName,                 colX.vendor,   y, { width: 115 });
// //     doc.text(sentAt,                     colX.sentAt,   y, { width: 90 });

// //     doc.moveDown(0.6);
// //   });

// //   doc.end();
// // };





// import VendorNotification from "../models/VendorNotification.js";
// import PDFDocument from "pdfkit";

// export const getNotificationReport = async ({
//   customer,
//   fromDate,
//   toDate,
//   page = 1,
//   limit = 10,
// }) => {
//   const match = {};

//   // Customer filter
//   if (customer && customer !== "all") {
//     match.vendorId = customer;
//   }

//   // Date filter
//   if (fromDate || toDate) {
//     match.sentAt = {};

//     if (fromDate) {
//       match.sentAt.$gte = new Date(fromDate);
//     }

//     if (toDate) {
//       const end = new Date(toDate);
//       end.setHours(23, 59, 59, 999);
//       match.sentAt.$lte = end;
//     }
//   }

//   const pipeline = [
//     { $match: match },

//     {
//       $lookup: {
//         from: "vendors",
//         localField: "vendorId",
//         foreignField: "_id",
//         as: "vendor",
//       },
//     },

//     // ✅ Correct option
//     {
//       $unwind: {
//         path: "$vendor",
//         preserveNullAndEmptyArrays: true,
//       },
//     },

//     {
//       $project: {
//         dispatchDate: "$sentAt",
//         customerName: {
//           $ifNull: ["$vendor.storeName", "$customerName"],
//         },
//         vendorCode: "$vendor.vendorId",
//         channel: 1,
//         message: 1,
//         deliveryStatus: 1,
//       },
//     },

//     { $sort: { dispatchDate: -1 } },
//   ];

//   const totalResult = await VendorNotification.aggregate([
//     ...pipeline,
//     { $count: "total" },
//   ]);

//   const total = totalResult[0]?.total || 0;

//   const records = await VendorNotification.aggregate([
//     ...pipeline,
//     { $skip: (page - 1) * limit },
//     { $limit: limit },
//   ]);

//   const summary = await VendorNotification.aggregate([
//     { $match: match },
//     {
//       $group: {
//         _id: "$deliveryStatus",
//         count: { $sum: 1 },
//       },
//     },
//   ]);

//   return {
//     records,
//     pagination: {
//       page,
//       limit,
//       total,
//       totalPages: Math.ceil(total / limit),
//     },
//     summary,
//   };
// };

// export const streamNotificationPDF = (res, report) => {
//   const doc = new PDFDocument({ margin: 40 });

//   res.setHeader("Content-Type", "application/pdf");
//   res.setHeader(
//     "Content-Disposition",
//     "inline; filename=notification-report.pdf"
//   );

//   doc.pipe(res);

//   doc.fontSize(18).text("Customer Vendor Notification Report", {
//     align: "center",
//   });

//   doc.moveDown();

//   report.records.forEach((item, index) => {
//     doc
//       .fontSize(11)
//       .text(
//         `${index + 1}. ${item.customerName} | ${item.vendorCode || "-"}`
//       );

//     doc.text(`Date : ${new Date(item.dispatchDate).toLocaleDateString()}`);
//     doc.text(`Channel : ${item.channel}`);
//     doc.text(`Status : ${item.deliveryStatus}`);
//     doc.text(`Message : ${item.message}`);
//     doc.moveDown();
//   });

//   doc.end();
// };





/**
 * Telecaller CRM — Report Service
 * Notification Report + PDF Generation
 */

import mongoose from "mongoose";
import VendorNotification from "../models/VendorNotification.js";
import PDFDocument from "pdfkit";

// ─────────────────────────────────────────────────────────────────────────────
// GET NOTIFICATION REPORT
// ─────────────────────────────────────────────────────────────────────────────

export const getNotificationReport = async ({
  customer,
  fromDate,
  toDate,
  page = 1,
  limit = 10,
}) => {
  const match = {};

  // ───────────────────────────────────────────────────────────────────────────
  // Customer / Vendor filter
  // ───────────────────────────────────────────────────────────────────────────

  if (
    customer &&
    customer !== "all" &&
    customer !== "--All Customers--" &&
    mongoose.Types.ObjectId.isValid(customer)
  ) {
    match.vendorId = new mongoose.Types.ObjectId(customer);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Date filter
  // ───────────────────────────────────────────────────────────────────────────

  if (fromDate || toDate) {
    match.sentAt = {};

    if (fromDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);

      match.sentAt.$gte = start;
    }

    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);

      match.sentAt.$lte = end;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Aggregation
  // ───────────────────────────────────────────────────────────────────────────

  const pipeline = [
    {
      $match: match,
    },

    // Get Vendor information
    {
      $lookup: {
        from: "vendors",
        localField: "vendorId",
        foreignField: "_id",
        as: "vendor",
      },
    },

    {
      $unwind: {
        path: "$vendor",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Prepare report fields
    {
      $project: {
        _id: 1,

        dispatchDate: "$sentAt",

        companyName: {
          $ifNull: [
            "$vendor.storeName",
            {
              $ifNull: ["$customerName", "Unknown Customer"],
            },
          ],
        },

        vendorCode: {
          $ifNull: ["$vendor.vendorId", ""],
        },

        channel: 1,

        message: 1,

        deliveryStatus: 1,

        customerName: 1,

        vendorId: 1,
      },
    },

    // Latest notifications first
    {
      $sort: {
        dispatchDate: -1,
      },
    },
  ];

  // ───────────────────────────────────────────────────────────────────────────
  // Total records
  // ───────────────────────────────────────────────────────────────────────────

  const totalResult = await VendorNotification.aggregate([
    ...pipeline,
    {
      $count: "total",
    },
  ]);

  const total = totalResult[0]?.total || 0;

  // ───────────────────────────────────────────────────────────────────────────
  // Pagination
  // ───────────────────────────────────────────────────────────────────────────

  const records = await VendorNotification.aggregate([
    ...pipeline,

    {
      $skip: (page - 1) * limit,
    },

    {
      $limit: limit,
    },
  ]);

  // ───────────────────────────────────────────────────────────────────────────
  // Summary
  // ───────────────────────────────────────────────────────────────────────────

  const summaryResult = await VendorNotification.aggregate([
    {
      $match: match,
    },

    {
      $group: {
        _id: "$deliveryStatus",
        count: {
          $sum: 1,
        },
      },
    },
  ]);

  const summary = {
    total,
    delivered: 0,
    pending: 0,
    failed: 0,
  };

  summaryResult.forEach((item) => {
    if (item._id === "Delivered") {
      summary.delivered = item.count;
    }

    if (item._id === "Pending") {
      summary.pending = item.count;
    }

    if (item._id === "Failed") {
      summary.failed = item.count;
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Format response
  // ───────────────────────────────────────────────────────────────────────────

  const formattedRecords = records.map((item) => ({
    id: item._id,

    dispatchDate: item.dispatchDate,

    companyName: item.companyName,

    vendorCode: item.vendorCode,

    notificationChannel: formatChannel(item.channel),

    notificationDetails: item.message,

    deliveryStatus: item.deliveryStatus,

    customerName: item.customerName,

    vendorId: item.vendorId,
  }));

  return {
    records: formattedRecords,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },

    summary,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// CHANNEL FORMATTER
// ─────────────────────────────────────────────────────────────────────────────

const formatChannel = (channel) => {
  switch (channel) {
    case "SMS":
      return "SMS";

    case "EMAIL":
      return "Email";

    case "WHATSAPP":
      return "WhatsApp";

    default:
      return channel || "-";
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PDF
// ─────────────────────────────────────────────────────────────────────────────

export const streamNotificationPDF = (res, report) => {
  const doc = new PDFDocument({
    margin: 40,
    size: "A4",
  });

  res.setHeader(
    "Content-Type",
    "application/pdf"
  );

  res.setHeader(
    "Content-Disposition",
    `inline; filename=notification-report-${Date.now()}.pdf`
  );

  doc.pipe(res);

  // Title
  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text(
      "Customer Vendor Notification Report",
      {
        align: "center",
      }
    );

  doc.moveDown();

  // Summary
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("Report Summary");

  doc.moveDown(0.3);

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(`Total Records : ${report.summary.total}`)
    .text(`Delivered     : ${report.summary.delivered}`)
    .text(`Pending       : ${report.summary.pending}`)
    .text(`Failed        : ${report.summary.failed}`);

  doc.moveDown();

  // Line
  doc
    .moveTo(40, doc.y)
    .lineTo(555, doc.y)
    .stroke();

  doc.moveDown();

  // Records
  report.records.forEach((item, index) => {
    if (doc.y > 700) {
      doc.addPage();
    }

    const date = item.dispatchDate
      ? new Date(item.dispatchDate).toLocaleDateString("en-IN")
      : "-";

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text(
        `${index + 1}. ${item.companyName || "-"}`
      );

    doc
      .fontSize(9)
      .font("Helvetica")
      .text(`Dispatch Date : ${date}`)
      .text(`Vendor Code   : ${item.vendorCode || "-"}`)
      .text(`Channel       : ${item.notificationChannel || "-"}`)
      .text(`Status        : ${item.deliveryStatus || "-"}`)
      .text(`Details       : ${item.notificationDetails || "-"}`);

    doc.moveDown();
  });

  doc.end();
};